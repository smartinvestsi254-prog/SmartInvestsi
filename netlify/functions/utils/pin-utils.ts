// PIN utility functions with bcrypt

import bcrypt from 'bcrypt';

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(hashedPin: string, inputPin: string): Promise<boolean> {
  return bcrypt.compare(inputPin, hashedPin);
}

export function generateTransactionRef(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

export function generateAccountId(): string {
  return `SI-ACCT-${Date.now().toString().slice(-5)}`;
}

