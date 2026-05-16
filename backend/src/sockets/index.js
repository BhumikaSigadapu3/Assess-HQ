import { verifyAccessToken } from "../utils/jwt.js";
import { SOCKET_EVENTS } from "../modules/realtime/events.js";

export const registerSocketHandlers = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.userId = null;
      return next();
    }
    try {
      const payload = verifyAccessToken(token);
      socket.userId = String(payload.sub);
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on(SOCKET_EVENTS.LEADERBOARD_JOIN, (examId) => {
      if (!examId) return;
      socket.join(`leaderboard:${examId}`);
    });

    socket.on(SOCKET_EVENTS.PRESENCE_EXAM, ({ examId, online }) => {
      if (!examId || !socket.userId) return;
      socket.join(`exam:${examId}`);
      socket.to(`exam:${examId}`).emit(SOCKET_EVENTS.PRESENCE_UPDATE, {
        userId: socket.userId,
        online: Boolean(online)
      });
    });

    socket.on(SOCKET_EVENTS.CODING_JOIN, ({ roomId }) => {
      if (!roomId) return;
      socket.join(`coding:${roomId}`);
    });

    socket.on(SOCKET_EVENTS.CODING_SYNC, ({ roomId, payload }) => {
      if (!roomId || !socket.userId) return;
      socket.to(`coding:${roomId}`).emit(SOCKET_EVENTS.CODING_UPDATE, {
        ...payload,
        fromUserId: socket.userId
      });
    });

    socket.on(SOCKET_EVENTS.NOTIFICATION_SUBSCRIBE, () => {
      if (socket.userId) socket.join(`user:${socket.userId}`);
    });
  });
};
