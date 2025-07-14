import Message from "../models/message.models.js";
import User from "../models/user.models.js";
import Group from "../models/group.models.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { getReceiverSocketId, io } from "../utils/socket.io.js";

// Get all users except self
export const getContacts = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const users = await User.find({ _id: { $ne: userId } }).select("-password");
  res.status(200).json(new ApiResponse(200, users, "Fetched Friends"));
});

// Get one-on-one chat messages
export const getConversation = asyncHandler(async (req, res) => {
  const { _id: userId } = req.user;
  const { id: otherUserId } = req.params;

  const messages = await Message.find({
    $or: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId }
    ],
  })
    .sort({ createdAt: 1 })
    .populate("senderId", "fullName avatar")
    .populate("receiverId", "fullName avatar");

  res.status(200).json(new ApiResponse(200, messages, "Fetched Conversation"));
});

// Send direct message
export const sendMessage = asyncHandler(async (req, res) => {
  const { _id: senderId } = req.user;
  const { id: receiverId } = req.params;
  const { text } = req.body;

  let imageUrl = null;
  if (req.file) {
    const upload = await uploadOnCloudinary(req.file.path);
    imageUrl = upload?.secure_url || null;
    if (!imageUrl) throw new ApiError(500, "Failed to upload image");
  }

  if (!text && !imageUrl) throw new ApiError(400, "Message cannot be empty");

  const message = await Message.create({ senderId, receiverId, text: text || "", image: imageUrl || "" });

  const socketId = getReceiverSocketId(receiverId);
  if (socketId) io.to(socketId).emit("newMessage", message);

  res.status(201).json(new ApiResponse(201, message, "Message sent successfully"));
});

// Create a new group
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

// Send a group message
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

  const message = await Message.create({ senderId, groupId, text: text || "", image: imageUrl || "" });

  const group = await Group.findById(groupId);
  group.members.forEach((memberId) => {
    const socketId = getReceiverSocketId(memberId.toString());
    if (socketId) io.to(socketId).emit("newGroupMessage", message);
  });

  res.status(201).json(new ApiResponse(201, message, "Group message sent"));
});

// Get messages from a group
export const getGroupMessages = asyncHandler(async (req, res) => {
  const { id: groupId } = req.params;

  const messages = await Message.find({ groupId })
    .sort({ createdAt: 1 })
    .populate("senderId", "fullName avatar");

  res.status(200).json(new ApiResponse(200, messages, "Group messages fetched"));
});

// Get groups the user is in
export const getGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ members: req.user._id }).select("name _id avatar");
  res.status(200).json(new ApiResponse(200, groups, "Groups fetched"));
});

// Mark a message as read
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