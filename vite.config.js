import { defineConfig } from "vite";

// base "./" để bản build trong dist/ chạy được từ thư mục bất kỳ (Release v1.0.0 dạng web tĩnh)
export default defineConfig({
  base: "./",
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 900 },
});
