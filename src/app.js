import express from "express";
import cors from "cors";

import authRouter from "./routes/auth.routes.js";
import messageRouter from "./routes/message.routes.js";

const app = express();

const whitelist = ["http://192.168.1.91:8081", "exp://192.168.1.91:8081"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || whitelist.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/group", messageRouter); 

export { app };