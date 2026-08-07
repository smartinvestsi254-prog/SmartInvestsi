// TypeScript declarations for missing modules
declare module '@smartinvest/shared-security' {
  export function hashPassword(password: string): string;
  export function verifyPassword(password: string, hash: string): boolean;
  export function encryptToken(token: string, secret: string): string;
  export function decryptToken(enc: string): string;
  export function deviceFingerprint(req: any): any;
}