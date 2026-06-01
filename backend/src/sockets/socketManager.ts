import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";

// Хеш-таблиця для зберігання активних з'єднань: Map<userId, Socket>
export const activeSockets = new Map<string, Socket>();

export const initSockets = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  // Middleware для автентифікації сокет-з'єднання
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Помилка авторизації: Відсутній токен"));

    try {
      const decoded = verifyToken(token);
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Помилка авторизації: Недійсний токен"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    // Пов'язуємо унікальний ідентифікатор користувача з його об'єктом сокету
    activeSockets.set(userId, socket);
    console.log(`Клієнт підключений: ${userId}`);

    socket.on("disconnect", () => {
      activeSockets.delete(userId);
      console.log(`Клієнт відключений: ${userId}`);
    });
  });

  return io;
};

// Функція для відправки згенерованого розкладу конкретному користувачу
export const sendRecommendationToUser = (
  userId: string,
  recommendation: any,
) => {
  const userSocket = activeSockets.get(userId);
  if (userSocket) {
    userSocket.emit("schedule_ready", recommendation);
  }
};
