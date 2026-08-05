import bcrypt from 'bcryptjs';

export async function hashPin(pin: string): Promise<string> {
  if (pin.length < 4 || pin.length > 6) {
    throw new Error('PIN must be 4-6 digits');
  }
  return bcrypt.hash(pin, 12);
}

export async function verifyPin(hashedPin: string, inputPin: string): Promise<boolean> {
  return bcrypt.compare(inputPin, hashedPin);
}
