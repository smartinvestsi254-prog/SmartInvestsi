import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secure-32-character-secret";

export interface AuthUser {
  id: string;
  role: string;
  email: string;
}

export async function validateAuthToken(token: string): Promise<AuthUser> {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid token format");
  }

  // Extract token if passed as "Bearer <token>"
  const cleanToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token.trim();

  try {
    // 1. Verify the cryptographic signature of the JWT token
    const decoded = jwt.verify(cleanToken, JWT_SECRET) as { userId: string; email: string; role: string };
    
    // 2. Return payload structures without hammering the database on every single sub-request
    return {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
  } catch (error) {
    // Fallback: If verification failed but you need a DB validation check for revoked sessions
    console.error('JWT verification failed, checking database state...', error);
    throw new Error("Invalid or expired session token");
  }
}
