import { prisma } from "../utils/prismaClient";
import { GoogleGenAI, Type } from "@google/genai";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Допоміжна функція для форматування хвилин у "HH:MM" для промпту
const formatMinutesToTime = (minutes?: null | number) => {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

export const generateOptimizedSchedule = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { user_id: userId } });
  const pendingTasks = await prisma.task.findMany({
    where: { user_id: userId, status: "PENDING" },
  });

  const activityLogs = await prisma.activityLog.findMany({
    where: { user_id: userId },
  });

  let avgDeviation = 1.0;
  if (activityLogs.length > 0) {
    const validLogs = activityLogs.filter(
      (log) => log.deviation_coefficient !== null,
    );
    const sum = validLogs.reduce(
      (acc, log) => acc + (log.deviation_coefficient as number),
      0,
    );
    avgDeviation = validLogs.length > 0 ? sum / validLogs.length : 1.0;
  }

  if (pendingTasks.length === 0) return [];

  // ОНОВЛЕНО: Формуємо рядок часу сну для нейромережі
  const sleepTimeStr =
    user?.sleep_start_minutes != null && user?.sleep_end_minutes != null
      ? `${formatMinutesToTime(user.sleep_start_minutes)} - ${formatMinutesToTime(user.sleep_end_minutes)}`
      : "23:00 - 07:00";

  const prompt = `
    User Context:
    - Timezone: ${user?.timezone || "UTC"}
    - Preferred Sleep Time: ${sleepTimeStr}
    - Max Tasks Per Day: ${user?.max_tasks_per_day || 5}
    - Historical Deviation Coefficient: ${avgDeviation.toFixed(2)} (Multiply all estimated_duration by this factor to get realistic duration).

    Tasks to Schedule:
    ${JSON.stringify(pendingTasks, null, 2)}

    Instruction: Generate an optimized schedule. Assign a start and end time for each task. Do not overlap tasks. Respect strict deadlines. Do not schedule tasks during the "Preferred Sleep Time".
  `;

  const MAX_RETRIES = 3;
  const INITIAL_DELAY_MS = 3000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[AI] Спроба генерації розкладу ${attempt} для користувача ${userId}...`,
      );

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert time-management system backend module. Your sole purpose is to analyze tasks, apply biological deviation coefficients, and output perfectly structured scheduling data.",
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                task_id: { type: Type.STRING, description: "UUID of the task" },
                suggested_start: {
                  type: Type.STRING,
                  description: "ISO 8601 datetime format",
                },
                suggested_end: {
                  type: Type.STRING,
                  description: "ISO 8601 datetime format",
                },
              },
              required: ["task_id", "suggested_start", "suggested_end"],
            },
          },
        },
      });

      if (!response.text) throw new Error("Порожня відповідь від моделі");

      const parsedSchedule = JSON.parse(response.text);
      console.log(`[AI] Успішно згенеровано розклад на спробі ${attempt}`);
      return parsedSchedule;
    } catch (error: any) {
      console.error(
        `[AI Error]: Спроба ${attempt} провалилася. Причина:`,
        error.message,
      );
      if (attempt === MAX_RETRIES) {
        throw new Error("Gemini API зараз перевантажений. Спробуйте пізніше.");
      }
      const currentDelay = INITIAL_DELAY_MS * attempt;
      console.log(
        `[AI] Очікування ${currentDelay / 1000} секунд перед наступною спробою...`,
      );
      await delay(currentDelay);
    }
  }
};
