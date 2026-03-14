using System;
using System.Globalization;
using System.Numerics;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SmartInvest.Data;
using SmartInvest.Models.Entities.Payment;

namespace SmartInvest.Services.Payment
{
    public interface ICryptoPaymentService
    {
        Task<CryptoPaymentIntent> CreateIntentAsync(string userId, CryptoPaymentCreateInput input);
        Task<CryptoPaymentVerificationResult> VerifyAsync(string userId, string reference, string transactionHash);
    }

    public class CryptoPaymentService : ICryptoPaymentService
    {
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<CryptoPaymentService> _logger;

        public CryptoPaymentService(IConfiguration configuration, ApplicationDbContext db, IHttpClientFactory httpClientFactory, ILogger<CryptoPaymentService> logger)
        {
            _configuration = configuration;
            _db = db;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<CryptoPaymentIntent> CreateIntentAsync(string userId, CryptoPaymentCreateInput input)
        {
            var treasury = _configuration["CRYPTO_TREASURY_ADDRESS"];
            if (string.IsNullOrWhiteSpace(treasury))
            {
                throw new InvalidOperationException("CRYPTO_TREASURY_ADDRESS not configured");
            }

            var chainId = ParseInt(_configuration["CRYPTO_CHAIN_ID"], 1);
            var asset = _configuration["CRYPTO_ASSET_SYMBOL"] ?? "ETH";
            var decimals = ParseInt(_configuration["CRYPTO_NATIVE_DECIMALS"], 18);
            var usdRate = ParseDecimal(_configuration["CRYPTO_USD_RATE"], 0m);
            var ttlMinutes = ParseInt(_configuration["CRYPTO_PAYMENT_TTL_MINUTES"], 30);

            var amountNative = input.AmountNative ?? 0m;
            var amountUsd = input.AmountUsd ?? 0m;
            if (amountNative <= 0m)
            {
                if (amountUsd <= 0m || usdRate <= 0m)
                {
                    throw new InvalidOperationException("Provide amountNative or set amountUsd with CRYPTO_USD_RATE");
                }

                amountNative = amountUsd / usdRate;
            }

            var amountWei = ToWei(amountNative, decimals);
            var reference = $"SI-{DateTime.UtcNow:yyyyMMddHHmmss}-{RandomHex(6)}";
            var memo = $"SI:{reference}";

            var intent = new CryptoPaymentIntent
            {
                UserId = userId,
                Reference = reference,
                AssetSymbol = asset,
                ChainId = chainId,
                TreasuryAddress = treasury,
                AmountWei = amountWei.ToString(),
                AmountNative = decimal.Round(amountNative, 8),
                AmountUsd = decimal.Round(amountUsd, 2),
                Memo = memo,
                Status = CryptoPaymentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(ttlMinutes)
            };

            _db.CryptoPaymentIntents.Add(intent);
            await _db.SaveChangesAsync();

            return intent;
        }

        public async Task<CryptoPaymentVerificationResult> VerifyAsync(string userId, string reference, string transactionHash)
        {
            var intent = await _db.CryptoPaymentIntents.FirstOrDefaultAsync(i => i.Reference == reference && i.UserId == userId);
            if (intent == null)
            {
                return new CryptoPaymentVerificationResult { Success = false, Message = "Payment intent not found" };
            }

            if (intent.Status == CryptoPaymentStatus.Confirmed)
            {
                return new CryptoPaymentVerificationResult { Success = true, Message = "Already confirmed", Intent = intent };
            }

            if (intent.ExpiresAt <= DateTime.UtcNow)
            {
                intent.Status = CryptoPaymentStatus.Expired;
                await _db.SaveChangesAsync();
                return new CryptoPaymentVerificationResult { Success = false, Message = "Payment intent expired", Intent = intent };
            }

            var rpcUrl = _configuration["CRYPTO_RPC_URL"];
            if (string.IsNullOrWhiteSpace(rpcUrl))
            {
                return new CryptoPaymentVerificationResult { Success = false, Message = "CRYPTO_RPC_URL not configured" };
            }

            var tx = await FetchTransactionAsync(rpcUrl, transactionHash);
            var receipt = await FetchReceiptAsync(rpcUrl, transactionHash);
            if (tx == null || receipt == null)
            {
                return new CryptoPaymentVerificationResult { Success = false, Message = "Transaction not found" };
            }

            var to = NormalizeAddress(tx.To);
            var treasury = NormalizeAddress(intent.TreasuryAddress);
            if (!string.Equals(to, treasury, StringComparison.OrdinalIgnoreCase))
            {
                return new CryptoPaymentVerificationResult { Success = false, Message = "Transaction does not match treasury address" };
            }

            var valueWei = ParseHex(tx.Value);
            var expectedWei = BigInteger.Parse(intent.AmountWei, CultureInfo.InvariantCulture);
            if (valueWei < expectedWei)
            {
                return new CryptoPaymentVerificationResult { Success = false, Message = "Transaction amount below required minimum" };
            }

            if (!string.IsNullOrWhiteSpace(intent.Memo) && !ContainsMemo(tx.Input, intent.Memo))
            {
                return new CryptoPaymentVerificationResult { Success = false, Message = "Missing payment reference memo" };
            }

            var confirmations = await GetConfirmationsAsync(rpcUrl, tx.BlockNumber);
            var requiredConfirmations = ParseInt(_configuration["CRYPTO_REQUIRED_CONFIRMATIONS"], 2);
            if (confirmations < requiredConfirmations || receipt.Status != "0x1")
            {
                return new CryptoPaymentVerificationResult
                {
                    Success = false,
                    Message = "Awaiting confirmations",
                    Intent = intent,
                    Confirmations = confirmations
                };
            }

            intent.Status = CryptoPaymentStatus.Confirmed;
            intent.TransactionHash = transactionHash;
            intent.Confirmations = confirmations;
            intent.ConfirmedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return new CryptoPaymentVerificationResult
            {
                Success = true,
                Message = "Payment confirmed",
                Intent = intent,
                Confirmations = confirmations
            };
        }

        private static int ParseInt(string value, int fallback)
        {
            return int.TryParse(value, out var parsed) ? parsed : fallback;
        }

        private static decimal ParseDecimal(string value, decimal fallback)
        {
            return decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed) ? parsed : fallback;
        }

        private static BigInteger ToWei(decimal amount, int decimals)
        {
            var multiplier = BigInteger.Pow(10, decimals);
            var scaled = decimal.Round(amount, decimals);
            var raw = (scaled * (decimal)multiplier);
            return new BigInteger(raw);
        }

        private static string RandomHex(int bytes)
        {
            var buffer = new byte[bytes];
            Random.Shared.NextBytes(buffer);
            var sb = new StringBuilder(bytes * 2);
            foreach (var b in buffer) sb.Append(b.ToString("x2", CultureInfo.InvariantCulture));
            return sb.ToString();
        }

        private async Task<EvmTransaction> FetchTransactionAsync(string rpcUrl, string hash)
        {
            return await RpcCallAsync<EvmTransaction>(rpcUrl, "eth_getTransactionByHash", hash);
        }

        private async Task<EvmReceipt> FetchReceiptAsync(string rpcUrl, string hash)
        {
            return await RpcCallAsync<EvmReceipt>(rpcUrl, "eth_getTransactionReceipt", hash);
        }

        private async Task<int> GetConfirmationsAsync(string rpcUrl, string blockNumber)
        {
            if (string.IsNullOrWhiteSpace(blockNumber)) return 0;
            var latest = await RpcCallAsync<string>(rpcUrl, "eth_blockNumber");
            if (string.IsNullOrWhiteSpace(latest)) return 0;

            var latestBlock = ParseHex(latest);
            var txBlock = ParseHex(blockNumber);
            if (latestBlock < txBlock) return 0;

            return (int)(latestBlock - txBlock + 1);
        }

        private async Task<T> RpcCallAsync<T>(string rpcUrl, string method, params object[] parameters)
        {
            var payload = new
            {
                jsonrpc = "2.0",
                method,
                @params = parameters,
                id = 1
            };

            var client = _httpClientFactory.CreateClient();
            var response = await client.PostAsync(rpcUrl, new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("RPC call failed: {Status}", response.StatusCode);
                return default;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("result", out var result))
            {
                return result.Deserialize<T>(new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }

            return default;
        }

        private static string NormalizeAddress(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;
            return value.StartsWith("0x", StringComparison.OrdinalIgnoreCase) ? value.ToLowerInvariant() : $"0x{value.ToLowerInvariant()}";
        }

        private static BigInteger ParseHex(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return BigInteger.Zero;
            var hex = value.StartsWith("0x", StringComparison.OrdinalIgnoreCase) ? value[2..] : value;
            if (string.IsNullOrWhiteSpace(hex)) return BigInteger.Zero;
            return BigInteger.Parse(hex, NumberStyles.HexNumber);
        }

        private static bool ContainsMemo(string input, string memo)
        {
            if (string.IsNullOrWhiteSpace(input)) return false;
            var memoHex = Encoding.UTF8.GetBytes(memo);
            var memoHexString = BitConverter.ToString(memoHex).Replace("-", string.Empty).ToLowerInvariant();
            var normalizedInput = input.StartsWith("0x", StringComparison.OrdinalIgnoreCase) ? input[2..].ToLowerInvariant() : input.ToLowerInvariant();
            return normalizedInput.Contains(memoHexString, StringComparison.OrdinalIgnoreCase);
        }
    }

    public class CryptoPaymentCreateInput
    {
        public decimal? AmountUsd { get; set; }
        public decimal? AmountNative { get; set; }
    }

    public class CryptoPaymentVerificationResult
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int Confirmations { get; set; }
        public CryptoPaymentIntent Intent { get; set; }
    }

    public class EvmTransaction
    {
        [JsonPropertyName("hash")]
        public string Hash { get; set; }

        [JsonPropertyName("to")]
        public string To { get; set; }

        [JsonPropertyName("value")]
        public string Value { get; set; }

        [JsonPropertyName("input")]
        public string Input { get; set; }

        [JsonPropertyName("blockNumber")]
        public string BlockNumber { get; set; }
    }

    public class EvmReceipt
    {
        [JsonPropertyName("status")]
        public string Status { get; set; }
    }
}
