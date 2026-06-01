export interface ScheduleSlot {
  task_id: string;
  suggested_start: string;
  suggested_end: string;
}

export const validateSchedule = (
  schedule: ScheduleSlot[],
  dbTasks: any[],
): boolean => {
  // Сортуємо розклад за часом початку для коректної перевірки перетинів часових проміжків
  const sorted = [...schedule].sort(
    (a, b) =>
      new Date(a.suggested_start).getTime() -
      new Date(b.suggested_start).getTime(),
  );

  const now = Date.now(); // Поточний час для перевірки на актуальність

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const start = new Date(current.suggested_start).getTime();
    const end = new Date(current.suggested_end).getTime();

    // 1. Перевірка на логіку часу (кінець не може бути раніше початку)
    if (end <= start) return false;

    // 2. Перевірка на минулий час (завдання не можна планувати в минулому)
    if (start < now) return false;

    // 3. Intersection Check (Математична перевірка перетинів завдань між собою)
    if (i < sorted.length - 1) {
      const nextStart = new Date(sorted[i + 1].suggested_start).getTime();
      if (end > nextStart) return false; // Завдання накладаються одне на одне
    }

    // 4. Перевірка жорсткого дедлайну завдання
    const taskRecord = dbTasks.find((t) => t.task_id === current.task_id);
    if (taskRecord && new Date(taskRecord.deadline).getTime() < end) {
      return false; // Запропонований розклад порушує дедлайн, встановлений користувачем
    }
  }

  return true; // Усі рівні валідації пройдено успішно
};
