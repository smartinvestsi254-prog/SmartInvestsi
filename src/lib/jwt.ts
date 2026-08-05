import jwt from "jsonwebtoken";
import { env } from "../config/env.server";

const CURRENT = env.JWT_SECRET_CURRENT || env.JWT_SECRET;
const PREVIOUS = env.JWT_SECRET_PREVIOUS;

export function signToken(payload: object, expiresIn = "15m") {
  return jwt.sign(payload, CURRENT, { expiresIn });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, CURRENT);
  } catch {
    if (PREVIOUS) {
      return jwt.verify(token, PREVIOUS);
    }
    throw new Error("Invalid token");
  }
}

const REFRESH_CURRENT = env.JWT_REFRESH_SECRET_CURRENT || env.JWT_REFRESH_SECRET;
const REFRESH_PREVIOUS = env.JWT_REFRESH_SECRET_PREVIOUS;

export function verifyRefreshToken(token: string): any {
  try {
    return jwt.verify(token, REFRESH_CURRENT);
  } catch {
    if (REFRESH_PREVIOUS) {
      return jwt.verify(token, REFRESH_PREVIOUS);
    }
    throw new Error("Invalid refresh token");
  }
}
