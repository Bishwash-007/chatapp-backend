import { Router } from "express";
import {
  loginUser,
  signupUser,
  logoutUser,
  updateProfile,
  checkAuth,
} from "../controllers/auth.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

router.post("/sign-up", signupUser);
router.post("/sign-in", loginUser);
router.post("/log-out", logoutUser);

router.put(
  "/update-profile",
  verifyJWT,
  upload.single("avatar"),
  updateProfile
);

router.get("/check", verifyJWT, checkAuth);

export default router;
