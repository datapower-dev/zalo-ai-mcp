import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { adminUserRepo } from "../database/db.js";

// Các giá trị mặc định đã công khai trên GitHub -> ai cũng có thể tự ký token admin.
const KNOWN_DEFAULT_SECRETS = new Set([
    "zalo-admin-secret-key-change-in-production-2026",
    "zalo-admin-secret-key-change-in-production-2026-ubuntu-deployment",
]);

function resolveJwtSecret(): string {
    const secret = (process.env.JWT_SECRET || "").trim();
    if (!secret || KNOWN_DEFAULT_SECRETS.has(secret) || secret.length < 32) {
        throw new Error(
            "JWT_SECRET chưa được cấu hình an toàn. Đặt JWT_SECRET ngẫu nhiên (>= 32 ký tự) trong server/.env, ví dụ: " +
            "node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
        );
    }
    return secret;
}

export const JWT_SECRET = resolveJwtSecret();

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username: string;
        name: string;
    };
}

export function generateToken(payload: { id: string; username: string; name: string }): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({
            success: false,
            error: "Yêu cầu đăng nhập. Token không tồn tại hoặc không hợp lệ."
        });
        return;
    }

    const token = authHeader.substring(7).trim();

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; name: string };
        const adminUser = adminUserRepo.getById(decoded.id);

        if (!adminUser) {
            res.status(401).json({
                success: false,
                error: "Tài khoản quản trị không tồn tại hoặc đã bị khóa."
            });
            return;
        }

        req.user = {
            id: adminUser.id,
            username: adminUser.username,
            name: adminUser.name
        };

        next();
    } catch (err: any) {
        if (err.name === "TokenExpiredError") {
            res.status(401).json({
                success: false,
                error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
            });
            return;
        }
        res.status(401).json({
            success: false,
            error: "Token không hợp lệ. Vui lòng đăng nhập lại."
        });
    }
}
