import { Router } from "express";
import {
  loginUser,
  signupUser,
  logoutUser,
  updateProfile,
} from "../controllers/auth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";

const authRouter = Router();

authRouter.post("/sign-up", signupUser);
authRouter.post("/sign-in", loginUser);
authRouter.post("/log-out", logoutUser);

authRouter.put(
  "/update-profile",
  verifyJWT,
  upload.single("avatar"),
  updateProfile
);

export default authRouter;
