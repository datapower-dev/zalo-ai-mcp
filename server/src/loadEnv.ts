// Nạp biến môi trường TRƯỚC khi mọi module khác được đánh giá.
// (ESM hoist import, nên gọi dotenv.config() trong app.ts là quá muộn đối với
// các singleton như pineconeService / authMiddleware.)
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// dist/loadEnv.js -> ../.env = server/.env ; src/loadEnv.ts (tsx) -> ../.env = server/.env
dotenv.config({ path: path.resolve(here, "../.env") });
// Fallback: .env tại thư mục làm việc hiện tại (nếu có)
dotenv.config();
