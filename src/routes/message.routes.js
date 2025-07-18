import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  createGroup,
  getContacts,
  getConversation,
  getGroupMessages,
  getGroups,
  markMessageAsRead,
  sendGroupMessage,
  sendMessage,
} from "../controllers/message.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();

router.get("/contacts", verifyJWT, getContacts);
router.get("/messages/:id", verifyJWT, getConversation);
router.post("/messages/send/:id", verifyJWT, upload.single("image"), sendMessage);
router.post("/groups", verifyJWT, createGroup);
router.post("/groups/:id", verifyJWT, upload.single("image"), sendGroupMessage);
router.get("/groups/send/:id/messages", verifyJWT, getGroupMessages);
router.get("/groups", verifyJWT, getGroups);
router.post("/messages/:messageId/read", verifyJWT, markMessageAsRead);

export default router;
