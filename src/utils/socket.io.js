import { Server } from "socket.io";
import http from "http";
import express from "express";
import ApiError from "./ApiError.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

//used to store online users
const userSocketMap = {};

io.on("connection", (socket) => {
  console.log("user connected", socket.id);

  const userId = socket.handshake.query.userId;

  if (!userId) {
    throw new ApiError(500, "Internal Server error");
  }

  userSocketMap[userId] = socket.io;
  io.emit("getOnlineUsers", Object.keys(userSocketMap)); // used to send events to all the connected clients

  socket.on("disconnect", () => {
    delete userSocketMap[userId];
    console.log("User disconnected", socket.id);
  });
});

export { io, app, server };
