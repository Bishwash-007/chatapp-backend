import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.models.js";
import Group from "../models/group.models.js";

const app = express();
const server = http.createServer(app);
const userSocketMap = {};

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

export const getReceiverSocketId = (userId) => userSocketMap[userId];

const getGroupById = async (groupId) => {
  return await Group.findById(groupId).select("members");
};

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;

  if (!userId) return console.error("No userId in handshake");

  userSocketMap[userId] = socket.id;
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Read receipt
  socket.on("messageRead", async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message || message.readBy.includes(userId)) return;

      message.readBy.push(userId);
      await message.save();

      const senderSocketId = getReceiverSocketId(message.senderId.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageRead", { messageId, readBy: userId });
      }
    } catch (err) {
      console.error("messageRead error:", err.message);
    }
  });

  // Typing indicators
  socket.on("typing", async ({ receiverId, groupId, senderId }) => {
    if (groupId) {
      const group = await getGroupById(groupId);
      group.members.forEach((memberId) => {
        if (memberId.toString() !== senderId) {
          const socketId = getReceiverSocketId(memberId.toString());
          if (socketId) io.to(socketId).emit("groupTyping", { groupId, senderId });
        }
      });
    } else if (receiverId) {
      const socketId = getReceiverSocketId(receiverId);
      if (socketId) io.to(socketId).emit("typing", { senderId });
    }
  });

  socket.on("stopTyping", async ({ receiverId, groupId, senderId }) => {
    if (groupId) {
      const group = await getGroupById(groupId);
      group.members.forEach((memberId) => {
        if (memberId.toString() !== senderId) {
          const socketId = getReceiverSocketId(memberId.toString());
          if (socketId) io.to(socketId).emit("stopGroupTyping", { groupId, senderId });
        }
      });
    } else if (receiverId) {
      const socketId = getReceiverSocketId(receiverId);
      if (socketId) io.to(socketId).emit("stopTyping", { senderId });
    }
  });

  socket.on("disconnect", () => {
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
    console.log("User disconnected:", socket.id);
  });
});

export { io, app, server };