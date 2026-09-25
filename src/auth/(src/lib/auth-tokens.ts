import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secure-32-character-secret";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  console.warn("WARNING: JWT_SECRET environment variable is missing in production!");
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  isAdmin: boolean;
}

interface DecodedJwt {
  userId?: string;
  id?: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
}

export async function validateAuthToken(token: string): Promise<AuthUser> {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid token format");
  }

  // Extract token if passed as "Bearer <token>"
  const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();

  try {
    // 1. Verify the cryptographic signature of the JWT token
    const decoded = jwt.verify(cleanToken, JWT_SECRET) as DecodedJwt;

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      throw new Error("Invalid token structure: missing user identifier");
    }

    const isAdmin = Boolean(decoded.isAdmin || decoded.role === "ADMIN" || decoded.role === "admin");
    const role = decoded.role || (isAdmin ? "ADMIN" : "USER");

    // 2. Return validated user structure without DB call
    return {
      id: userId,
      email: decoded.email || "",
      role,
      isAdmin,
    };
  } catch (error) {
    console.error("JWT verification failed:", error instanceof Error ? error.message : error);
    throw new Error("Invalid or expired session token");
  }
}
