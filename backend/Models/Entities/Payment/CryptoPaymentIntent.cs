using System;
using System.ComponentModel.DataAnnotations;

namespace SmartInvest.Models.Entities.Payment
{
    public class CryptoPaymentIntent
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; }

        [Required]
        [StringLength(32)]
        public string Reference { get; set; }

        [Required]
        [StringLength(20)]
        public string AssetSymbol { get; set; }

        public int ChainId { get; set; }

        [Required]
        [StringLength(128)]
        public string TreasuryAddress { get; set; }

        [Required]
        public string AmountWei { get; set; }

        public decimal AmountNative { get; set; }

        public decimal AmountUsd { get; set; }

        public CryptoPaymentStatus Status { get; set; }

        public string Memo { get; set; }

        public string TransactionHash { get; set; }

        public int Confirmations { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime ExpiresAt { get; set; }

        public DateTime? ConfirmedAt { get; set; }
    }

    public enum CryptoPaymentStatus
    {
        Pending,
        Confirmed,
        Failed,
        Expired
    }
}
