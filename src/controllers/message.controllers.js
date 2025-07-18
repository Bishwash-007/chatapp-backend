import Message from "../models/message.models.js";
import User from "../models/user.models.js";
import Group from "../models/group.models.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { io, getReceiverSocketId } from "../utils/socket.io.js";

export const getContacts = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const users = await User.find({ _id: { $ne: userId } }).select("-password");
  res.status(200).json(new ApiResponse(200, users, "Fetched Friends"));
});

export const getConversation = asyncHandler(async (req, res) => {
  const { _id: userId } = req.user;
  const { id: otherUserId } = req.params;

  const messages = await Message.find({
    $or: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId },
    ],
  })
    .sort({ createdAt: 1 })
    .populate("senderId", "fullName avatar")
    .populate("receiverId", "fullName avatar");

  res.status(200).json(new ApiResponse(200, messages, "Fetched Conversation"));
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { _id: senderId } = req.user;
  const { id: receiverId } = req.params;
  const text = req.body.message;

  let imageUrls = [];

  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files) {
      const upload = await uploadOnCloudinary(file.path);
      if (upload?.secure_url) {
        imageUrls.push(upload.secure_url);
      } else {
        throw new ApiError(500, "Failed to upload image");
      }
    }
  }

  if (!text?.trim() && imageUrls.length === 0) {
    throw new ApiError(400, "Message cannot be empty");
  }

  const messageData = {
    senderId,
    receiverId,
    text: text || "",
    image: imageUrls.length > 0 ? imageUrls : "",
  };

  const message = await new Message(messageData).save();

  const socketId = getReceiverSocketId(receiverId);
  if (socketId) {
    io.to(socketId).emit("newMessage", message);
  }

  res
    .status(201)
    .json(new ApiResponse(201, message, "Message sent successfully"));
});

export const createGroup = asyncHandler(async (req, res) => {
  const { name, members } = req.body;
  const createdBy = req.user._id;

  if (!name || !members || members.length < 2)
    throw new ApiError(400, "Group must have a name and at least 2 members");

  const group = await Group.create({
    name,
    members: [...members, createdBy],
    createdBy,
  });

  res.status(201).json(new ApiResponse(201, group, "Group created"));
});

export const sendGroupMessage = asyncHandler(async (req, res) => {
  const { _id: senderId } = req.user;
  const { id: groupId } = req.params;
  const { text } = req.body;

  let imageUrl = null;
  if (req.file) {
    const upload = await uploadOnCloudinary(req.file.path);
    imageUrl = upload?.secure_url || null;
  }

  if (!text && !imageUrl) throw new ApiError(400, "Message cannot be empty");

  const message = await Message.create({
    senderId,
    groupId,
    text: text || "",
    image: imageUrl || "",
  });

  const group = await Group.findById(groupId);
  group.members.forEach((memberId) => {
    const socketId = getReceiverSocketId(memberId.toString());
    if (socketId) io.to(socketId).emit("newGroupMessage", message);
  });

  res.status(201).json(new ApiResponse(201, message, "Group message sent"));
});

export const getGroupMessages = asyncHandler(async (req, res) => {
  const { id: groupId } = req.params;

  const messages = await Message.find({ groupId })
    .sort({ createdAt: 1 })
    .populate("senderId", "fullName avatar");

  res
    .status(200)
    .json(new ApiResponse(200, messages, "Group messages fetched"));
});

export const getGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ members: req.user._id }).select(
    "name _id avatar"
  );
  res.status(200).json(new ApiResponse(200, groups, "Groups fetched"));
});

export const markMessageAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message.readBy.includes(userId)) {
    message.readBy.push(userId);
    await message.save();

    const senderSocketId = getReceiverSocketId(message.senderId.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageRead", { messageId, readBy: userId });
    }
  }

  res.status(200).json(new ApiResponse(200, message, "Marked as read"));
});
