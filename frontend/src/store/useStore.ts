import { create } from "zustand";

export interface Task {
  task_id: string;
  title: string;
  estimated_duration: number;
  priority_level: number;
  deadline: string;
  status: string;
  start_time?: string;
  end_time?: string;
}

export interface ScheduleSlot {
  task_id: string;
  suggested_start: string;
  suggested_end: string;
}

// Додаємо інтерфейс для користувача
export interface User {
  id: string;
  email: string;
}

interface AppState {
  token: string | null;
  user: User | null; // <-- Нове поле
  tasks: Task[];
  aiSchedule: ScheduleSlot[] | null;

  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void; // <-- Новий метод
  setTasks: (tasks: Task[]) => void;
  setAiSchedule: (schedule: ScheduleSlot[] | null) => void;

  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  optimisticUpdateTaskStatus: (taskId: string, status: string) => void;
}

export const useStore = create<AppState>((set) => ({
  token: localStorage.getItem("jwt_token"),
  user: localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user")!)
    : null, // Відновлюємо юзера з кешу
  tasks: [],
  aiSchedule: null,

  setToken: (token) => {
    if (token) {
      localStorage.setItem("jwt_token", token);
    } else {
      localStorage.removeItem("jwt_token");
    }
    set({ token });
  },

  // Метод для збереження юзера
  setUser: (user) => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
    set({ user });
  },

  setTasks: (tasks) => set({ tasks }),
  setAiSchedule: (aiSchedule) => set({ aiSchedule }),

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.task_id !== taskId),
    })),

  optimisticUpdateTaskStatus: (taskId, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.task_id === taskId ? { ...t, status } : t,
      ),
    })),
}));
