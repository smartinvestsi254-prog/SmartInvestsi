/**
 * Consistent JSON response helpers for the API.
 */

import type { Response } from "express";

export function success<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>) {
  return res.status(status).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...meta,
  });
}

export function created<T>(res: Response, data: T, meta?: Record<string, unknown>) {
  return success(res, data, 201, meta);
}

export function failure(
  res: Response,
  message: string,
  status = 400,
  code?: string,
  details?: unknown
) {
  return res.status(status).json({
    success: false,
    error: message,
    ...(code ? { code } : {}),
    ...(details !== undefined ? { details } : {}),
    timestamp: new Date().toISOString(),
  });
}

export function paginated<T>(
  res: Response,
  items: T[],
  page: number,
  pageSize: number,
  total: number
) {
  const hasMore = page * pageSize < total;
  return success(res, { items, page, pageSize, total, hasMore });
}

export function noContent(res: Response) {
  return res.status(204).send();
}

