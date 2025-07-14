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

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

async function getGroupById(groupId) {
  const group = await Group.findById(groupId).select("members");
  return group;
}

//connection handler
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  const userId = socket.handshake.query.userId;

  if (!userId) {
    console.error("No userId in handshake");
    return;
  }

  userSocketMap[userId] = socket.id;

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  //read receitpt
  socket.on("messageRead", async ({ messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      if (!message.readBy.includes(userId)) {
        message.readBy.push(userId);
        await message.save();

        const senderSocketId = getReceiverSocketId(message.senderId.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit("messageRead", {
            messageId,
            readBy: userId,
          });
        }
      }
    } catch (err) {
      console.error("Error in messageRead:", err.message);
    }
  });

  //if typing
  socket.on("typing", async ({ receiverId, groupId, senderId }) => {
    if (groupId) {
      const group = await getGroupById(groupId);
      group.members.forEach((memberId) => {
        if (memberId.toString() !== senderId) {
          const socketId = getReceiverSocketId(memberId.toString());
          if (socketId) {
            io.to(socketId).emit("groupTyping", { groupId, senderId });
          }
        }
      });
    } else if (receiverId) {
      const socketId = getReceiverSocketId(receiverId);
      if (socketId) {
        io.to(socketId).emit("typing", { senderId });
      }
    }
  });

  //if not typing
  socket.on("stopTyping", async ({ receiverId, groupId, senderId }) => {
    if (groupId) {
      const group = await getGroupById(groupId);
      group.members.forEach((memberId) => {
        if (memberId.toString() !== senderId) {
          const socketId = getReceiverSocketId(memberId.toString());
          if (socketId) {
            io.to(socketId).emit("stopGroupTyping", { groupId, senderId });
          }
        }
      });
    } else if (receiverId) {
      const socketId = getReceiverSocketId(receiverId);
      if (socketId) {
        io.to(socketId).emit("stopTyping", { senderId });
      }
    }
  });

  // end connection
  socket.on("disconnect", () => {
    delete userSocketMap[userId];
    console.log("User disconnected:", socket.id);
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
