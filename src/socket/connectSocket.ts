import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import { jwtHelpers } from "../app/helper/jwtHelpers";
import config from "../app/config";
import users from "../module/user/user.model";
import handleChatEvents from "./handleChatEvents";

let io: Server;

export const onlineUsers = new Map<string, string>();

export const connectSocket = (server: HTTPServer) => {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      transports: ["websocket", "polling"],
      pingInterval: 25000,
      pingTimeout: 20000,
    });
  }

  io.on("connection", async (socket: Socket) => {
    console.log("Socket Connected:", socket.id);

    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        socket.emit("socket-error", {
          message: "Authentication token missing",
        });

        return socket.disconnect(true);
      }

      const decoded: any = await jwtHelpers.verifyToken(
        String(token),
        config.jwt_access_secret as string
      );

      if (!decoded?.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
        socket.emit("socket-error", {
          message: "Invalid Token",
        });

        return socket.disconnect(true);
      }

      const user = await users.findById(decoded.id);

      if (!user) {
        socket.emit("socket-error", {
          message: "User not found",
        });

        return socket.disconnect(true);
      }

      const currentUserId = user._id.toString();

      socket.data.userId = currentUserId;

      onlineUsers.set(currentUserId, socket.id);

      socket.join(currentUserId);

      await users.findByIdAndUpdate(currentUserId, {
        isOnline: true,
      });

      socket.emit("connected", {
        success: true,
        userId: currentUserId,
      });

      socket.broadcast.emit("user-online", {
        userId: currentUserId,
      });

      handleChatEvents(io, socket, currentUserId);

      socket.on("disconnect", async () => {
        onlineUsers.delete(currentUserId);

        await users.findByIdAndUpdate(currentUserId, {
          isOnline: false,
        });

        socket.broadcast.emit("user-offline", {
          userId: currentUserId,
        });

        console.log("Disconnected:", currentUserId);
      });
    } catch (error) {
      console.error(error);

      socket.emit("socket-error", {
        message: "Authentication Failed",
      });

      socket.disconnect(true);
    }
  });

  return io;
};

export const getSocketIO = () => {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }

  return io;
};