all# Environment Variables Reference

This document lists all environment variables used in SmartInvest. Copy values to your `.env` file for local development or set them in your deployment platform (Netlify, Vercel, etc.).

## Application
| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment mode | `development` or `production` |
| PORT | Server port | `3001` |
| APP_URL | Full application URL | `https://smartinvestsi.netlify.app` |
| FRONTEND_URL | Frontend URL | `https://smartinvestsi.netlify.app` |

## Database
| Variable | Description |
|----------|-------------|
| MONGODB_URI | MongoDB connection string |
| DATABASE_URL | PostgreSQL/Prisma connection string |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_ANON_KEY | Supabase anonymous key (public-safe) |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role key (secret) |

## Authentication & Security
| Variable | Description | Required |
|----------|-------------|----------|
| JWT_SECRET | Secret for JWT tokens (min 32 random chars) | Yes (production) |
| SESSION_SECRET | Session encryption secret | Yes |
| ENFORCE_STRICT_JWT | Enable strict JWT validation | `true` |
| MAX_LOGIN_ATTEMPTS | Max failed login attempts | `5` |
| LOCKOUT_DURATION | Account lockout duration (minutes) | `15` |

## PayPal Payments
| Variable | Description | Required |
|----------|-------------|----------|
| PAYPAL_MODE | `sandbox` or `live` | Yes |
| PAYPAL_CLIENT_ID | PayPal application client ID | Yes |
| PAYPAL_CLIENT_SECRET | PayPal application client secret | Yes |
| PAYPAL_RECEIVER_EMAIL | Business email for receiving payments | Yes |
| PAYPAL_RETURN_URL | Payment success redirect URL | No |
| PAYPAL_CANCEL_URL | Payment cancel redirect URL | No |

## M-Pesa (Kenya Mobile Money)
| Variable | Description |
|----------|-------------|
| MPESA_ENV | `sandbox` or `production` |
| MPESA_CONSUMER_KEY | API consumer key |
| MPESA_CONSUMER_SECRET | API consumer secret |
| MPESA_SHORTCODE | Business shortcode |
| MPESA_PASSKEY | Security credential |
| MPESA_CALLBACK_URL | Webhook URL for transaction callbacks |
| MPESA_ACCOUNT_REF | Account reference |
| MPESA_TRANSACTION_TIMEOUT | Timeout in minutes |

## OKX Crypto Payments
| Variable | Description | Required |
|----------|-------------|----------|
| CRYPTO_OKX_API_KEY | OKX API key | For crypto payments |
| CRYPTO_OKX_API_SECRET | OKX API secret | For crypto payments |
| CRYPTO_CHAIN_ID | Blockchain chain ID (1=ETH mainnet) | Yes |
| CRYPTO_ASSET_SYMBOL | Crypto asset symbol (e.g., ETH) | Yes |
| CRYPTO_NATIVE_DECIMALS | Token decimals | Yes |
| CRYPTO_PAYMENT_TTL_MINUTES | Payment expiry time | `30` |
| CRYPTO_REQUIRED_CONFIRMATIONS | Block confirmations needed | `12` |
| CRYPTO_USD_RATE | Manual USD rate fallback | Optional |
| CRYPTO_RPC_URL | Blockchain RPC endpoint | Yes |

## Market Data APIs
| Variable | Description |
|----------|-------------|
| ALPHAVANTAGE_API_KEY | AlphaVantage stock/crypto API |
| IEX_API_KEY | IEX Cloud market data |

## Email/SMTP
| Variable | Description |
|----------|-------------|
| EMAIL_HOST | SMTP server hostname |
| EMAIL_PORT | SMTP port (usually 587) |
| EMAIL_USER | SMTP username |
| EMAIL_PASSWORD | SMTP password |
| EMAIL_FROM | From email address |
| EMAIL_FROM_NAME | From display name |
| SUPPORT_EMAIL | Support contact email |
| SUPPORT_PHONE | Support phone number |

## Chatbase AI Chat Support
| Variable | Description | Required |
|----------|-------------|----------|
| CHATBASE_API_KEY | Chatbase API key for AI chatbot | Yes |
| CHATBASE_BOT_ID | Chatbase bot ID | Yes |
| CHATBASE_CHATBOT_ID | Chatbase chatbot ID | Yes |
| CHATBASE_API_URL | Chatbase API endpoint | `https://www.chatbase.co/api/v1/chat` |

## Feature Flags
| Variable | Default | Description |
|----------|---------|-------------|
| FEATURE_PREMIUM_ACCESS | `true` | Enable premium subscriptions |
| FEATURE_COPY_TRADING | `true` | Enable copy trading |
| FEATURE_PORTFOLIO_MANAGEMENT | `true` | Enable portfolio features |
| FEATURE_ALERTS | `true` | Enable price alerts |
| FRAUD_CHECK_ENABLED | `true` | Enable fraud detection |
| FRAUD_BLOCK_THRESHOLD | `3` | Block after this many failures |
| FRAUD_REVIEW_THRESHOLD | `2` | Flag for review |

## Subscriptions
| Variable | Default | Description |
|----------|---------|-------------|
| PREMIUM_SUBSCRIPTION_COST | `10` | Premium plan price (USD) |
| ENTERPRISE_SUBSCRIPTION_COST | `20` | Enterprise plan price (USD) |
| CURRENCY | `USD` | Default currency |
| EXCHANGE_RATE_KES_USD | `0.0085` | KES to USD rate |
| EXCHANGE_RATE_UPDATE_INTERVAL | `3600000` | Rate update interval (ms) |

## Rate Limiting
| Variable | Default | Description |
|----------|---------|-------------|
| RATE_LIMIT_ENABLED | `true` | Enable rate limiting |
| RATE_LIMIT_MAX_REQUESTS | `100` | Max requests per window |
| RATE_LIMIT_WINDOW_MS | `900000` | Window size (15 minutes) |

## File Uploads
| Variable | Default | Description |
|----------|---------|-------------|
| MAX_FILE_SIZE | `10485760` | Max upload size (bytes) |
| UPLOAD_DIR | `./uploads` | Upload directory |

## Webhooks
| Variable | Default | Description |
|----------|---------|-------------|
| WEBHOOK_ENABLE_VERIFICATION | `true` | Verify webhook signatures |
| WEBHOOK_RETRY_ATTEMPTS | `3` | Retry failed webhooks |
| WEBHOOK_TIMEOUT | `30000` | Timeout (ms) |

## Logging
| Variable | Default | Description |
|----------|---------|-------------|
| LOG_LEVEL | `info` | Log verbosity |
| LOG_REQUESTS | `false` | Log incoming requests |
| LOG_RESPONSES | `false` | Log responses |
| LOG_ERRORS | `true` | Log errors |
| LOG_DIR | `./logs` | Log directory |

## Debug
| Variable | Default | Description |
|----------|---------|-------------|
| DEBUG_ENABLED | `true` | Enable debug mode |

