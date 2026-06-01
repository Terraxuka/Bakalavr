import { Request, Response } from "express";
import { prisma } from "../utils/prismaClient";
import { hashPassword, verifyPassword, generateToken } from "../utils/jwt";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, timezone } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email та пароль обов'язкові" });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: "Користувач з таким email вже існує" });
      return;
    }

    const hashedPassword = await hashPassword(password);

    // Створюємо користувача в єдиній базі
    const newUser = await prisma.user.create({
      data: {
        email,
        hashed_password: hashedPassword,
        timezone: timezone || "Europe/Kyiv",
        max_tasks_per_day: 5,
        sleep_start_minutes: 1380,
        sleep_end_minutes: 420,
      },
    });

    const token = generateToken(newUser.user_id);
    res
      .status(201)
      .json({ token, user: { id: newUser.user_id, email: newUser.email } });
  } catch (error) {
    console.error("Помилка реєстрації:", error);
    res.status(500).json({ error: "Внутрішня помилка сервера" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Невірний email або пароль" });
      return;
    }

    const isPasswordValid = await verifyPassword(
      password,
      user.hashed_password,
    );
    if (!isPasswordValid) {
      res.status(401).json({ error: "Невірний email або пароль" });
      return;
    }

    const token = generateToken(user.user_id);
    res
      .status(200)
      .json({ token, user: { id: user.user_id, email: user.email } });
  } catch (error) {
    console.error("Помилка логіну:", error);
    res.status(500).json({ error: "Внутрішня помилка сервера" });
  }
};
