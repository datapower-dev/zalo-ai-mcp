import type { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { qrAuthService } from "../services/qrAuthService.js";
import { JWT_SECRET } from "../middleware/authMiddleware.js";
import { adminUserRepo } from "../database/db.js";

/**
 * Lấy JWT từ handshake: ưu tiên socket.handshake.auth.token (socket.io-client `auth`),
 * fallback header Authorization: Bearer <token>.
 */
function extractToken(socket: Socket): string | null {
    const authToken = (socket.handshake.auth as Record<string, unknown> | undefined)?.token;
    if (typeof authToken === "string" && authToken.trim()) {
        return authToken.trim();
    }
    const header = socket.handshake.headers.authorization;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
        return header.substring(7).trim();
    }
    return null;
}

export function setupSocketIO(io: Server) {
    qrAuthService.setSocketServer(io);

    // Bắt buộc xác thực Admin cho mọi kết nối Socket.IO.
    // Nếu không, bất kỳ ai truy cập được port đều nhận realtime toàn bộ tin nhắn Zalo
    // (sự kiện zalo:message) và có thể tạo phiên quét QR.
    io.use((socket, next) => {
        const token = extractToken(socket);
        if (!token) {
            return next(new Error("Unauthorized"));
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
            const admin = adminUserRepo.getById(decoded.id);
            if (!admin) {
                return next(new Error("Unauthorized"));
            }
            socket.data.user = { id: admin.id, username: admin.username, name: admin.name };
            return next();
        } catch {
            return next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket: Socket) => {
        console.log(`🔌 Admin [${socket.data.user?.username}] connected to Socket.IO: ${socket.id}`);

        socket.on("qr:start", async () => {
            try {
                await qrAuthService.startQRSession(socket);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Không thể tạo phiên quét QR";
                socket.emit("qr:error", { message });
            }
        });

        socket.on("qr:cancel", ({ sessionId }: { sessionId: string }) => {
            if (sessionId) {
                qrAuthService.cancelSession(sessionId);
            }
        });

        socket.on("disconnect", () => {
            console.log(`🔌 Client disconnected from Socket.IO: ${socket.id}`);
        });
    });
}
