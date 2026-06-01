import axios from "axios";
import { io, Socket } from "socket.io-client";
import { useStore, type ScheduleSlot } from "../store/useStore";

// Використовуємо відносний шлях! Nginx сам направить запит на бекенд завдяки location /api/
const API_URL = "/api";
let socket: Socket | null = null;

export const apiClient = axios.create({
  baseURL: API_URL,
});

// Інтерцептор для додавання JWT токена
apiClient.interceptors.request.use((config) => {
  const token = useStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const initWebSocket = () => {
  const token = useStore.getState().token;
  if (!token || socket) return;

  // Socket.io автоматично підключиться до поточного домену,
  // а Nginx перенаправить location /socket.io/ куди треба.
  socket = io("/", {
    auth: { token },
  });

  socket.on("connect", () => console.log("WebSocket з'єднано!"));

  socket.on(
    "schedule_ready",
    (data: { status: string; schedule: ScheduleSlot[] }) => {
      if (data.status === "SUCCESS") {
        useStore.getState().setAiSchedule(data.schedule);
      } else {
        alert("Помилка генерації розкладу: " + data.status);
      }
    },
  );
};

// НОВА ФУНКЦІЯ: для очищення з'єднання при виході з акаунту
export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("WebSocket від'єднано!");
  }
};
