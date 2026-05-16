import { useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import { SOCKET_EVENTS } from "../constants/socketEvents.js";

const defaultSocketUrl = () => {
  const base = import.meta.env.VITE_SOCKET_URL;
  if (base) return base;
  const api = import.meta.env.VITE_API_BASE_URL || "";
  const stripped = api.replace(/\/api\/v1\/?$/, "");
  if (stripped.startsWith("http")) return stripped;
  if (typeof window !== "undefined" && api.startsWith("/")) {
    return window.location.origin;
  }
  return stripped || "http://localhost:5000";
};

export function useSocket(token) {
  const socket = useMemo(() => {
    const url = defaultSocketUrl();
    const instance = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: Boolean(token),
      auth: { token: token || undefined }
    });
    return instance;
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    socket.auth = { token };
    if (!socket.connected) socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket, token]);

  return { socket, SOCKET_EVENTS };
}
