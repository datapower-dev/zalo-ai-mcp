# Báo cáo rà soát bảo mật – zalo-multi-cskh-ai (commit 14f73a0, 25/10/2026)

## Kết luận
- **Không phát hiện mã độc / mã ẩn gửi dữ liệu ra ngoài.** Không có eval, obfuscation, child_process, webhook lạ, blob base64, hay host ngoài. Thư mục `dist` (đã commit) build lại từ `src` cho kết quả giống hệt.
- Mọi kết nối ra ngoài đều thuộc chức năng công khai: `*.zalo.me` (Zalo API), `registry.npmjs.org` (kiểm tra phiên bản thư viện, tắt được bằng `checkUpdate:false`), Pinecone (nếu cấu hình), và LLM mà admin tự nhập key (Gemini / OpenAI / DeepSeek / OpenRouter / Ollama).
- **Có 3 lỗi cấu hình nghiêm trọng** trong bản gốc, đã vá trong bản triển khai này.

## Lỗi đã vá
| # | Mức | Vấn đề gốc | Hậu quả nếu không vá | Bản vá |
|---|-----|------------|----------------------|--------|
| 1 | Cao | `server/src/services/pineconeService.ts` hardcode **API key + host Pinecone của tác giả** làm fallback | Tài liệu nội bộ tải lên kho tri thức và mọi câu hỏi của khách bị gửi sang index Pinecone của người khác (họ đọc được) | Bỏ fallback; không có key thì tắt Pinecone, dùng tìm kiếm từ khóa cục bộ |
| 2 | Nghiêm trọng | `JWT_SECRET` mặc định công khai trên GitHub, id admin cố định `admin-default-id`; `.env` bị nạp **sau** khi module đã đọc biến (ESM hoist) nên `.env` thực tế bị bỏ qua | Ai cũng tự ký được token admin hợp lệ → toàn quyền đọc chat, gửi tin, xóa tài khoản | Server từ chối khởi động nếu secret trống / mặc định / < 32 ký tự; thêm `loadEnv.ts` nạp `.env` trước mọi import; `deploy.sh` tự sinh secret ngẫu nhiên |
| 3 | Cao | Socket.IO **không xác thực**, CORS `*`; server `io.emit("zalo:message", ...)` tới mọi socket | Bất kỳ ai truy cập được port 5000 đọc realtime toàn bộ tin nhắn Zalo của mọi tài khoản, và mở phiên quét QR | Middleware `io.use` kiểm tra JWT; client chỉ kết nối sau khi đăng nhập, gửi token qua `auth.token` |
| 4 | Thấp | `GET /api/chat/:id/history/:threadId?limit=` không giới hạn | Kéo toàn bộ log một lần | Giới hạn 1–500 |

## Điểm còn lại cần lưu ý (chưa vá, thuộc thiết kế)
- Tài khoản mặc định **admin / admin** – đổi ngay sau lần đăng nhập đầu (menu Quản trị viên → Đổi mật khẩu).
- Cookie phiên Zalo, IMEI và API key LLM lưu **plaintext** trong `server/data/zalo_manager.db`. Bảo vệ quyền truy cập file/thư mục; không commit `data/`.
- `GET /api/ai/settings` trả API key LLM về cho admin (chỉ admin đã đăng nhập thấy được).
- Server lắng nghe mọi interface, CORS HTTP `*`. Nếu mở ra Internet hãy đặt sau reverse proxy có HTTPS và hạn chế IP.
- Thư viện core dùng **API Zalo cá nhân không chính thức** (giả lập Zalo Web). Rủi ro bị Zalo khóa tài khoản là rủi ro nghiệp vụ, không phải lỗi bảo mật.
- Nâng `better-sqlite3` lên 12.x để có binary dựng sẵn cho Node 24 (API không đổi).

## Triển khai hiện tại (máy này)
- Thư mục: `C:\Claude\zalo-ai` (clone từ GitHub, các bản vá ở dạng thay đổi chưa commit).
- Chạy bằng PM2: `pm2 list` / `pm2 logs zalo-cskh-server` / `pm2 restart zalo-cskh-server`. Đã `pm2 save`; PM2 trên Windows **không tự chạy khi khởi động lại máy** trừ khi cài thêm `pm2-windows-startup`.
- Web: http://localhost:5000 – Pinecone đang tắt (RAG dùng tìm kiếm từ khóa cục bộ); muốn bật thì điền `PINECONE_API_KEY`, `PINECONE_HOST` vào `server/.env` rồi `pm2 restart`.
