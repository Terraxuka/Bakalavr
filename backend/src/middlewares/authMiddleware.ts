import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

// Розширюємо інтерфейс Request для збереження користувача
export interface AuthRequest extends Request {
  user?: { userId: string };
}

export const authenticateJWT = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = verifyToken(token);
      req.user = decoded; // Додаємо ідентифікатор до об'єкта поточного запиту
      next();
    } catch (error) {
      res.status(403).json({ error: "Недійсний або прострочений токен" });
    }
  } else {
    res.status(401).json({ error: "Відсутній заголовок авторизації" });
  }
};
