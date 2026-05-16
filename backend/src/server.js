import http from "node:http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { registerSocketHandlers } from "./sockets/index.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.clientUrl,
    credentials: true
  }
});

registerSocketHandlers(io);

const startServer = async () => {
  try {
    await mongoose.connect(env.mongodbUri);
    logger.info("MongoDB connected");

    server.listen(env.port, () => {
      logger.info(`API running on port ${env.port}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
