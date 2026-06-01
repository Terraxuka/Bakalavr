import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { prisma } from "../utils/prismaClient";
import { generateOptimizedSchedule } from "../services/aiService";
import { validateSchedule, ScheduleSlot } from "../utils/scheduleValidator";
import { sendRecommendationToUser } from "../sockets/socketManager";

export const triggerScheduleOptimization = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  const userId = req.user!.userId;

  // Відправляємо HTTP-відповідь одразу (202 Accepted), щоб не блокувати клієнта.
  // Подальша комунікація піде через WebSockets.
  res.status(202).json({
    message:
      "Процес оптимізації розкладу ініційовано. Очікуйте повідомлення через WebSocket.",
  });

  // Запускаємо асинхронний фоновий процес (try-catch патерн для стійкості)
  setTimeout(async () => {
    try {
      const dbTasks = await prisma.task.findMany({
        where: { user_id: userId, status: "PENDING" },
      });
      let validSchedule: ScheduleSlot[] | null = null;
      let attempts = 0;
      const maxAttempts = 3;

      // Цикл автоматичного ре-промпту при провалі валідації
      while (attempts < maxAttempts && !validSchedule) {
        attempts++;
        console.log(
          `[AI] Спроба генерації розкладу ${attempts} для користувача ${userId}...`,
        );

        const rawSchedule = await generateOptimizedSchedule(userId);

        if (validateSchedule(rawSchedule, dbTasks)) {
          validSchedule = rawSchedule;
        } else {
          console.warn(
            `[AI] Валідацію не пройдено на спробі ${attempts}. Колізія часу або дедлайну.`,
          );
        }
      }

      if (validSchedule) {
        // Зберігаємо валідований розклад у таблицю RECOMMENDATIONS
        for (const slot of validSchedule) {
          await prisma.recommendation.create({
            data: {
              user_id: userId,
              task_id: slot.task_id,
              suggested_start: new Date(slot.suggested_start),
              suggested_end: new Date(slot.suggested_end),
            },
          });
        }

        // Трансляція результатів користувачеві через WebSocket (Event Emission)
        sendRecommendationToUser(userId, {
          status: "SUCCESS",
          schedule: validSchedule,
        });
      } else {
        throw new Error(
          "Не вдалося згенерувати розклад без колізій після 3 спроб.",
        );
      }
    } catch (error: any) {
      console.error(`[AI Error]: ${error.message}`);
      // Сповіщення користувача про помилку зв'язку/валідації
      sendRecommendationToUser(userId, {
        status: "ERROR",
        message:
          "Сталася помилка під час генерації розкладу. Мережевий тайм-аут або перевищення лімітів. Спробуйте пізніше.",
      });
    }
  }, 0);
};
