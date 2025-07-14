import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import User from "../models/user.models.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const isMobileRequest = (req) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith("Bearer ");
};

const signupUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new ApiError(400, "Email already in use");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({
    fullName,
    email,
    password: hashedPassword,
  });

  await newUser.save();

  const token = generateToken(newUser._id);

  if (!isMobileRequest(req)) {
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  res.status(201).json(
    new ApiResponse(201, {
      message: "User registered successfully",
      token: isMobileRequest(req) ? token : undefined,
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
      },
    })
  );
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(400, "Invalid Credentials");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid Credentials");
  }

  const token = generateToken(user._id);

  if (!isMobileRequest(req)) {
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        token: isMobileRequest(req) ? token : undefined,
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
      },
      "Logged in Successfully"
    )
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  if (!isMobileRequest(req)) {
    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "User Logged Out Successfully"));
});

const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.userId;

  if (!req.file) {
    throw new ApiError(400, "No avatar file uploaded");
  }

  const localFilePath = req.file.path;

  const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

  if (!cloudinaryResponse || !cloudinaryResponse.secure_url) {
    throw new ApiError(500, "Avatar upload failed");
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { avatar: cloudinaryResponse.secure_url },
    { new: true }
  ).select("-password");

  res.status(200).json(
    new ApiResponse(200, {
      message: "Profile updated successfully",
      user,
    })
  );
});

const checkAuth = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user retrieved"));
});

export { loginUser, signupUser, logoutUser, updateProfile, checkAuth };
