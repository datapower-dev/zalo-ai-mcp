import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

/**
 * Kết nối Socket.IO CHỈ sau khi admin đã đăng nhập, gửi JWT qua `auth.token`.
 * Server từ chối kết nối không có token hợp lệ.
 */
export function useSocket(token: string | null): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return;
    }

    const s = io({
      transports: ["websocket", "polling"],
      auth: { token },
    });

    s.on("connect", () => {
      console.log("Connected to Realtime Gateway:", s.id);
    });

    s.on("connect_error", (err) => {
      console.warn("Socket connect error:", err.message);
      if (err.message === "Unauthorized") {
        window.dispatchEvent(new Event("auth:unauthorized"));
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [token]);

  return socket;
}
