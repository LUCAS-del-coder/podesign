import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * 將明文密碼加密為 hash
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 驗證密碼是否正確
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
