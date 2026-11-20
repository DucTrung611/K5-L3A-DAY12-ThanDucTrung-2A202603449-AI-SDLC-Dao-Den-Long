import { defineConfig } from "vite";
import { resolve } from "node:path";
import { leaderboardMiddleware } from "./scripts/lib/leaderboard-store.js";

// Bảng xếp hạng lưu bền trên đĩa (data/leaderboard.json) qua /api/leaderboard khi chạy bằng `npm run dev` / `npm run preview`.
const leaderboardPlugin = () => ({
  name: "ddl-leaderboard",
  configureServer(s) {
    s.middlewares.use(leaderboardMiddleware()); // không trả về giá trị: vite hiểu hàm trả về là hook "post"
  },
  configurePreviewServer(s) {
    s.middlewares.use(leaderboardMiddleware());
  },
});

// base "./" để bản build trong dist/ chạy được từ thư mục bất kỳ (Release v1.0.0 dạng web tĩnh)
export default defineConfig({
  base: "./",
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 900, rollupOptions: { input: { main: resolve("index.html"), bench: resolve("bench.html") } } },
  plugins: [leaderboardPlugin()],
});
