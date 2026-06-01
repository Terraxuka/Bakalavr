import express from "express";
import cors from "cors";
import { createServer } from "http";
import { authenticateJWT } from "./middlewares/authMiddleware";
import { triggerScheduleOptimization } from "./controllers/scheduleController";
import { initSockets } from "./sockets/socketManager";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTaskStatus,
} from "./controllers/taskController";
import { register, login } from "./controllers/authController";

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// Захищені маршрути (Завдання та Оптимізація)
app.post("/api/tasks", authenticateJWT, createTask);
app.get("/api/tasks", authenticateJWT, getTasks);
app.put("/api/tasks/:id/status", authenticateJWT, updateTaskStatus);
app.delete("/api/tasks/:id", authenticateJWT, deleteTask);
app.post(
  "/api/schedule/optimize",
  authenticateJWT,
  triggerScheduleOptimization,
);

// Публічні маршрути (Автентифікація)
app.post("/api/auth/register", register);
app.post("/api/auth/login", login);

// Ініціалізація WebSockets з'єднання
initSockets(httpServer);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`Сервер успішно запущено на порту ${PORT}`);
  console.log(`Модуль WebSockets готовий до дуплексної комунікації`);
});
