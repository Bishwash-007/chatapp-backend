import Message from "../models/message.models.js";
import User from "../models/user.models.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { getReceiverSocketId, io } from "../utils/socket.io.js";

const getContacts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const filteredUsers = await User.find({
    _id: { $ne: userId },
  }).select("-password");

  res.status(200).json(new ApiResponse(200, filteredUsers, "Fetched Friends"));
});

const getConversation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { id: userToChatId } = req.params;

  const messages = await Message.find({
    $or: [
      { senderId: userId, receiverId: userToChatId },
      { senderId: userToChatId, receiverId: userId },
    ],
  })
    .sort({ createdAt: 1 })
    .populate("senderId", "fullName avatar") // Optional: enrich with sender info
    .populate("receiverId", "fullName avatar");

  res.status(200).json(new ApiResponse(200, messages, "Fetched Conversation"));
});

const createGroup = asyncHandler(async (req, res) => {
  const { name, members } = req.body;
  const createdBy = req.user._id;

  if (!name || !members || members.length < 2) {
    throw new ApiError(400, "Group must have a name and at least 2 members");
  }

  const group = await Group.create({
    name,
    members: [...members, createdBy],
    createdBy,
  });

  res.status(201).json(new ApiResponse(201, group, "Group created"));
});

const sendMessage = asyncHandler(async (req, res) => {
  const senderId = req.user._id;
  const { id: receiverId } = req.params;
  const { text } = req.body;

  let imageUrl = null;

  if (req.file) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    if (uploaded?.secure_url) {
      imageUrl = uploaded.secure_url;
    } else {
      throw new ApiError(500, "Failed to upload image");
    }
  }

  if (!text && !imageUrl) {
    throw new ApiError(400, "Message cannot be empty");
  }

  const newMessage = new Message({
    senderId,
    receiverId,
    text: text || "",
    image: imageUrl || "",
  });

  await newMessage.save();

  // TODO :: IMPLEMENT GROUP CHAT
  const receiverSocketId = getReceiverSocketId(receiverId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", newMessage);
  }

  res
    .status(201)
    .json(new ApiResponse(201, newMessage, "Message sent successfully"));
});

const sendGroupMessage = asyncHandler(async (req, res) => {
  const senderId = req.user._id;
  const { id: groupId } = req.params;
  const { text } = req.body;

  let imageUrl = null;
  if (req.file) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    imageUrl = uploaded?.secure_url;
  }

  if (!text && !imageUrl) {
    throw new ApiError(400, "Message cannot be empty");
  }

  const newMessage = await Message.create({
    senderId,
    groupId,
    text: text || "",
    image: imageUrl || "",
  });

  const group = await Group.findById(groupId);

  // notifies all group members via socket.io
  group.members.forEach((memberId) => {
    const socketId = getReceiverSocketId(memberId.toString());
    if (socketId) {
      io.to(socketId).emit("newGroupMessage", newMessage);
    }
  });

  res.status(201).json(new ApiResponse(201, newMessage, "Group message sent"));
});

const getGroupMessages = asyncHandler(async (req, res) => {
  const { id: groupId } = req.params;

  const messages = await Message.find({ groupId })
    .sort({ createdAt: 1 })
    .populate("senderId", "fullName avatar");

  res
    .status(200)
    .json(new ApiResponse(200, messages, "Group messages fetched"));
});

const getGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ members: req.user._id }).select(
    "name _id avatar"
  );
  res.status(200).json(new ApiResponse(200, groups, "Groups fetched"));
});

const markMessageAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message.readBy.includes(userId)) {
    message.readBy.push(userId);
    await message.save();

    const receiverSocketId = getReceiverSocketId(message.senderId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageRead", {
        messageId,
        readBy: userId,
      });
    }
  }

  res.status(200).json(new ApiResponse(200, message, "Marked as read"));
});

export {
  getContacts,
  getConversation,
  sendMessage,
  createGroup,
  getGroupMessages,
  sendGroupMessage,
  getGroups,
  markMessageAsRead
};
