// ============================================================
// @smartinvest/shared-utils — barrel export
// ============================================================

export {
  getEnv,
  requireEnv,
  getAllowedOrigins,
  isProduction,
} from "./env";

export {
  randomToken,
  generateIdempotencyKey,
  safeEqual,
  paginate,
  redact,
  uuid,
  stableStringify,
} from "./crypto";

export {
  ApiError,
  toHttpError,
} from "./errors";

export {
  success,
  created,
  failure,
  paginated,
  noContent,
} from "./response";

export {
  logger,
  getLogger,
} from "./logger";

export {
  formatDate,
  formatDateShort,
  formatCurrency,
  formatNumber,
  formatPercent,
  toDate,
  daysFromNow,
  hoursFromNow,
  minutesFromNow,
  isExpired,
  timeAgo,
} from "./dates";

export {
  isValidEmail,
  normalizeEmail,
  isValidPhone,
  maskPhone,
  isValidPassword,
  isValidUuid,
} from "./validation";

