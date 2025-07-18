import dotenv from "dotenv";
import connectToDatabase from "./db/db.js";
import { server } from "./utils/socket.io.js";

dotenv.config();

const PORT = process.env.PORT || 8000;

connectToDatabase()
  .then(() => {
    server.listen(PORT, () => {
      console.log("DB connected successfully");
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
  });