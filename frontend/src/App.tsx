import { useEffect, useState } from "react";
import { useStore } from "./store/useStore";
import { apiClient, initWebSocket, disconnectWebSocket } from "./services/api";
import {
  Clock,
  CheckCircle,
  Zap,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LogOut,
} from "lucide-react";

function App() {
  const {
    token,
    user,
    tasks,
    aiSchedule,
    setToken,
    setUser,
    setTasks,
    addTask,
    removeTask,
    setAiSchedule,
    optimisticUpdateTaskStatus,
  } = useStore();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authForm, setAuthForm] = useState({ email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Локальний стейт для модального вікна створення завдання
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    duration: 30,
    priority: 3,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Стейт для календаря (поточний день)
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (!token) {
      const testToken = import.meta.env.VITE_TEST_TOKEN;
      if (testToken) useStore.getState().setToken(testToken);
    }
    initWebSocket();

    const fetchTasks = async () => {
      try {
        const response = await apiClient.get("/tasks");
        setTasks(response.data);
      } catch (error) {
        console.error("Помилка завантаження завдань", error);
      }
    };
    fetchTasks();
  }, [token, setTasks]);

  const requestOptimization = async () => {
    try {
      await apiClient.post("/schedule/optimize");
      alert("Запит відправлено! ШІ аналізує дані. Очікуйте...");
    } catch (error) {
      console.error("Помилка запиту", error);
    }
  };

  const handleAcceptSchedule = async (taskId: string) => {
    const slot = aiSchedule?.find((s) => s.task_id === taskId);
    optimisticUpdateTaskStatus(taskId, "SCHEDULED");

    if (aiSchedule?.length === 1) {
      setAiSchedule(null);
    } else {
      setAiSchedule(aiSchedule?.filter((s) => s.task_id !== taskId) || null);
    }

    try {
      await apiClient.put(`/tasks/${taskId}/status`, {
        status: "SCHEDULED",
        start_time: slot?.suggested_start,
        end_time: slot?.suggested_end,
      });
      const response = await apiClient.get("/tasks");
      setTasks(response.data);
    } catch (error) {
      console.error("Помилка синхронізації", error);
      optimisticUpdateTaskStatus(taskId, "PENDING");
      alert("Помилка синхронізації. Спробуйте ще раз.");
    }
  };

  // --- ЛОГІКА: СТВОРЕННЯ ЗАВДАННЯ ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await apiClient.post("/tasks", {
        title: newTask.title,
        estimated_duration: newTask.duration,
        priority_level: newTask.priority,
      });
      addTask(response.data);
      setIsAddModalOpen(false);
      setNewTask({ title: "", duration: 30, priority: 3 });
    } catch (error) {
      console.error("Помилка створення", error);
      alert("Не вдалося створити завдання.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ЛОГІКА: ВИДАЛЕННЯ ЗАВДАННЯ ---
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Ви впевнені, що хочете видалити це завдання?")) return;
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      removeTask(taskId);
    } catch (error) {
      console.error("Помилка видалення", error);
      alert("Не вдалося видалити завдання.");
    }
  };

  // --- ЛОГІКА: КАЛЕНДАР ---
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const nextDay = () =>
    setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)));
  const prevDay = () =>
    setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)));
  const goToToday = () => setCurrentDate(new Date());

  const pendingTasks = tasks.filter((task) => task.status === "PENDING");

  const scheduledTasksForToday = tasks
    .filter((task) => task.status === "SCHEDULED" && task.start_time)
    .filter((task) => isSameDay(new Date(task.start_time!), currentDate))
    .sort(
      (a, b) =>
        new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime(),
    );

  // --- ВСТАВ ЦІ ФУНКЦІЇ ПЕРЕД RETURN ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);

    const endpoint = isLoginMode ? "/auth/login" : "/auth/register";

    try {
      const response = await apiClient.post(endpoint, {
        email: authForm.email,
        password: authForm.password,
      });
      setToken(response.data.token);
      setUser(response.data.user);
      setAuthForm({ email: "", password: "" });
    } catch (error: any) {
      setAuthError(
        error.response?.data?.error || "Виникла помилка. Спробуйте ще раз.",
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setTasks([]); // Очищаємо екран від тасок попереднього юзера
    disconnectWebSocket(); // <-- НОВИЙ РЯДОК: вбиваємо з'єднання
  };

  // --------------------------------------
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <h2 className="text-2xl font-bold text-center mb-6 flex justify-center items-center gap-2">
            <Zap className="text-blue-600" />{" "}
            {isLoginMode ? "Вхід у Smart Planner" : "Реєстрація"}
          </h2>

          {authError && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                required
                placeholder="hello@example.com"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Пароль</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
              />
            </div>
            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 font-medium"
            >
              {isAuthLoading
                ? "Зачекайте..."
                : isLoginMode
                  ? "Увійти"
                  : "Зареєструватись"}
            </button>
          </form>

          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setAuthError("");
            }}
            className="w-full mt-6 text-slate-500 text-sm hover:text-blue-600 transition"
          >
            {isLoginMode ? "Немає акаунту? Створити" : "Вже є акаунт? Увійти"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-800 font-sans pb-24">
      <header className="flex justify-between items-center mb-10 max-w-5xl mx-auto bg-white p-4 px-6 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <Zap className="text-blue-600" /> Smart Planner
        </h1>

        <div className="flex items-center gap-6">
          {user && (
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <span className="text-slate-400 font-bold">@</span> {user.email}
            </div>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-50 text-blue-700 border border-blue-100 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition shadow-sm flex items-center gap-2"
          >
            <Plus size={18} /> Додати
          </button>

          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-500 transition p-2 rounded-lg hover:bg-red-50"
            title="Вийти з акаунту"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ЛІВА КОЛОНКА: Очікують планування (Inbox) */}
        <div className="lg:col-span-5">
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-700">
                Очікують планування
              </h2>
              {pendingTasks.length > 0 && (
                <button
                  onClick={requestOptimization}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2 text-sm"
                >
                  <Zap size={16} /> ШІ Оптимізація
                </button>
              )}
            </div>

            {pendingTasks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 shadow-sm">
                Немає нових завдань. Створіть новий план!
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pendingTasks.map((task) => (
                  <div
                    key={task.task_id}
                    className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 transition hover:shadow-md group relative"
                  >
                    <button
                      onClick={() => handleDeleteTask(task.task_id)}
                      className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Видалити"
                    >
                      <Trash2 size={18} />
                    </button>
                    <h3 className="font-semibold text-lg text-slate-800 mb-3 pr-6">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Clock size={16} className="text-slate-400" />{" "}
                        {task.estimated_duration} хв.
                      </span>
                      <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide">
                        Пріоритет: {task.priority_level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ПРАВА КОЛОНКА: Календар (Таймлайн) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="text-blue-500" /> Розклад
            </h2>
            <div className="flex items-center gap-4 bg-slate-50 rounded-lg p-1 border border-slate-200">
              <button
                onClick={prevDay}
                className="p-1.5 text-slate-500 hover:bg-white hover:shadow-sm rounded transition"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-sm font-medium text-slate-700 hover:text-blue-600 transition capitalize"
              >
                {currentDate.toLocaleDateString("uk-UA", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </button>
              <button
                onClick={nextDay}
                className="p-1.5 text-slate-500 hover:bg-white hover:shadow-sm rounded transition"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="relative">
            {scheduledTasksForToday.length === 0 ? (
              <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-3">
                <CalendarIcon size={48} className="opacity-20" />
                <p>На цей день розклад порожній.</p>
              </div>
            ) : (
              <div className="space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                {scheduledTasksForToday.map((task) => (
                  <div
                    key={task.task_id}
                    className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-blue-100 text-blue-600 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <Clock size={18} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-emerald-50 border border-emerald-100 p-4 rounded-xl shadow-sm hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-emerald-800 text-sm">
                          {new Date(task.start_time!).toLocaleTimeString(
                            "uk-UA",
                            { hour: "2-digit", minute: "2-digit" },
                          )}{" "}
                          -{" "}
                          {new Date(task.end_time!).toLocaleTimeString(
                            "uk-UA",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                        <button
                          onClick={() => handleDeleteTask(task.task_id)}
                          className="text-slate-300 hover:text-red-500 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h3 className="font-semibold text-slate-800">
                        {task.title}
                      </h3>
                      <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                        <CheckCircle size={14} /> Згенеровано ШІ
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- МОДАЛЬНЕ ВІКНО СТВОРЕННЯ ЗАВДАННЯ --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-slate-800">
              Нове завдання
            </h2>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Назва
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  placeholder="Наприклад: Підготувати презентацію"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Тривалість (хв)
                  </label>
                  <input
                    type="number"
                    required
                    min="5"
                    step="5"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTask.duration}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        duration: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Пріоритет (1-5)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="5"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        priority: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition mt-4 disabled:bg-blue-400"
              >
                {isSubmitting ? "Збереження..." : "Зберегти"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- МОДАЛКА ШІ --- */}
      {aiSchedule && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 overflow-hidden transform transition-all">
            <h2 className="text-2xl font-bold mb-6 text-emerald-700 flex items-center gap-2">
              <Zap className="text-emerald-500" /> Gemini пропонує новий розклад
            </h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {aiSchedule.map((slot) => {
                const taskRef = tasks.find((t) => t.task_id === slot.task_id);
                return (
                  <div
                    key={slot.task_id}
                    className="border border-emerald-100 bg-emerald-50/50 p-5 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-lg text-slate-800">
                        {taskRef?.title || "Невідоме завдання"}
                      </p>
                      <p className="text-sm text-emerald-700 font-medium mt-1">
                        {new Date(slot.suggested_start).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(slot.suggested_end).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcceptSchedule(slot.task_id)}
                      className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium transition-colors shadow-sm"
                    >
                      <CheckCircle size={18} /> Прийняти
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setAiSchedule(null)}
              className="mt-8 text-slate-500 hover:text-slate-800 text-sm font-medium w-full text-center transition-colors"
            >
              Відхилити все та закрити
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
