/**
 * Standard API error types used across SmartInvestsi & SmartGovern.
 */

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Bad request", code?: string, details?: unknown): ApiError {
    return new ApiError(400, message, code ?? "BAD_REQUEST", details);
  }

  static unauthorized(message = "Unauthorized", code?: string): ApiError {
    return new ApiError(401, message, code ?? "UNAUTHORIZED");
  }

  static forbidden(message = "Forbidden", code?: string): ApiError {
    return new ApiError(403, message, code ?? "FORBIDDEN");
  }

  static notFound(message = "Not found", code?: string): ApiError {
    return new ApiError(404, message, code ?? "NOT_FOUND");
  }

  static conflict(message = "Conflict", code?: string): ApiError {
    return new ApiError(409, message, code ?? "CONFLICT");
  }

  static tooManyRequests(message = "Too many requests", code?: string): ApiError {
    return new ApiError(429, message, code ?? "RATE_LIMITED");
  }

  static internal(message = "An internal error occurred", code?: string): ApiError {
    return new ApiError(500, message, code ?? "INTERNAL_ERROR");
  }
}

/**
 * Express-compatible error handler factory. Attaches `statusCode` so an
 * upstream error middleware can render a consistent JSON body.
 */
export function toHttpError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error) {
    const status = (err as Error & { statusCode?: number }).statusCode ?? 500;
    return new ApiError(status, err.message);
  }
  return ApiError.internal();
}

