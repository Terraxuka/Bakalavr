import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { prisma } from "../utils/prismaClient";
import { z } from "zod";

// Схема валідації вхідних даних (deadline тепер опціональний)
const createTaskSchema = z.object({
  title: z.string().min(1, "Назва обов'язкова"),
  description: z.string().optional(),
  estimated_duration: z.number().int().positive(),
  priority_level: z.number().int().min(1).max(5),
  deadline: z.string().datetime().optional(),
});

// ЄДИНА функція створення завдання
export const createTask = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const validatedData = createTaskSchema.parse(req.body);

    // Якщо фронтенд не передав дедлайн, автоматично ставимо +7 днів
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);

    const newTask = await prisma.task.create({
      data: {
        user_id: userId,
        title: validatedData.title,
        description: validatedData.description,
        estimated_duration: validatedData.estimated_duration,
        priority_level: validatedData.priority_level,
        deadline: validatedData.deadline
          ? new Date(validatedData.deadline)
          : defaultDeadline,
        status: "PENDING",
      },
    });

    res.status(201).json(newTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
    } else {
      res.status(500).json({ error: "Внутрішня помилка сервера" });
    }
  }
};

// Отримання всіх завдань користувача
export const getTasks = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const tasks = await prisma.task.findMany({
      where: { user_id: userId },
      orderBy: { deadline: "asc" },
    });
    res.status(200).json(tasks);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Не вдалося отримати завдання" });
  }
};

// Оновлення статусу та ЧАСУ завдання
export const updateTaskStatus = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;
    const { status, start_time, end_time } = req.body;

    const updatedTask = await prisma.task.update({
      where: { task_id: id, user_id: userId },
      data: {
        status,
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null,
      },
    });

    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: "Не вдалося оновити статус та час" });
  }
};

// Видалення завдання
export const deleteTask = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const id = req.params.id as string;

    await prisma.task.delete({
      where: { task_id: id, user_id: userId },
    });

    res.status(200).json({ message: "Завдання успішно видалено" });
  } catch (error) {
    res.status(500).json({ error: "Не вдалося видалити завдання" });
  }
};
