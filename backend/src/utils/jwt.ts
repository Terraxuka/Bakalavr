import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET =
  process.env.JWT_SECRET || "super_secret_jwt_key_for_development";

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12); // Багатопрохідний режим хешування
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "3d" }); // Тепер сесія живе 3 дні
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};
