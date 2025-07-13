import Message from "../models/message.models.js";
import User from "../models/user.models.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

  res.status(201).json(
    new ApiResponse(201, newMessage, "Message sent successfully")
  );
});

export { getContacts, getConversation, sendMessage };