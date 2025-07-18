import { Server } from "socket.io";
import http from "http";
import { app } from "../app.js";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://192.168.1.91:8081"],
  },
});

const userSocketMap = {};

export const getReceiverSocketId = (userId) => userSocketMap[userId];

io.on("connection", (socket) => {
  console.log("User Connected", socket.id);

  //
  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  //this sends evens to all the connected users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
