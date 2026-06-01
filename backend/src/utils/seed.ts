import { prisma } from "./prismaClient";
import { generateToken, hashPassword } from "./jwt";

async function seedDatabase() {
  console.log("🌱 Запуск скрипта ініціалізації бази даних...");

  try {
    // Крок 1. Очищення бази (щоб не було дублікатів при повторних запусках)
    // Завдяки CASCADE у твоїй схемі, видалення користувача автоматично видалить і його завдання
    await prisma.user.deleteMany();
    console.log("🧹 Старі дані очищено.");

    // Крок 2. Створення реального користувача
    const hashedPassword = await hashPassword("TestPassword123!");
    const user = await prisma.user.create({
      data: {
        email: "test@planner.com", // <-- ДОДАНО
        hashed_password: hashedPassword,
        timezone: "Europe/Kyiv",
        max_tasks_per_day: 5,
        sleep_start_minutes: 1380,
        sleep_end_minutes: 420,
      },
    });

    // Крок 3. Генерація справжнього криптографічного JWT-токена
    const token = generateToken(user.user_id);
    console.log("\n==================================================");
    console.log("🔑 ТВІЙ ВАЛІДНИЙ JWT ТОКЕН ДЛЯ ФРОНТЕНДУ:");
    console.log(token);
    console.log("==================================================\n");

    // Крок 4. Створення тестових нерозподілених завдань для цього користувача
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1); // Дедлайн - завтра

    await prisma.task.createMany({
      data: [
        {
          user_id: user.user_id,
          title: "Написати вступ до дипломної роботи",
          description: "Зробити огляд літератури та описати архітектуру.",
          estimated_duration: 120, // 2 години
          priority_level: 5,
          deadline: tomorrow,
          status: "PENDING",
        },
        {
          user_id: user.user_id,
          title: "Налаштувати CI/CD пайплайн",
          description: "Написати GitHub Actions для Docker.",
          estimated_duration: 60, // 1 година
          priority_level: 4,
          deadline: tomorrow,
          status: "PENDING",
        },
        {
          user_id: user.user_id,
          title: "Сходити в спортзал",
          description: "Тренування на спину.",
          estimated_duration: 90, // 1.5 години
          priority_level: 3,
          deadline: tomorrow,
          status: "PENDING",
        },
      ],
    });
    console.log("📋 Додано 3 тестових завдання зі статусом PENDING.");

    console.log("✅ Ініціалізацію успішно завершено!");
  } catch (error) {
    console.error("❌ Помилка під час ініціалізації:", error);
  } finally {
    // Завжди закриваємо з'єднання з пулом після виконання одноразового скрипта
    await prisma.$disconnect();
  }
}

// Запуск функції
seedDatabase();
