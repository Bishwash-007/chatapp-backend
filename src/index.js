import dotenv from "dotenv";
import connectToDatabase from "./db/db.js";
import { server } from "./utils/socket.io.js";

dotenv.config({
  path: ".env",
});

connectToDatabase()
  .then(() => {
    server.listen(process.env.PORT || 8000, () => {
      console.log("connected to database");
      console.log(`server running http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("connection failed", err);
  });
