import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // <-- Додаємо цей імпорт

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- Активуємо плагін
  ],
});
