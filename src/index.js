import dotenv from "dotenv";
import connectToDatabase from "./db/db.js";
// import { server } from "./utils/socket.io.js";
import { app } from "./app.js";

dotenv.config({
  path: ".env",
});

connectToDatabase()
  .then(() => {
    //replace app with sockets server for socket
    app.listen(process.env.PORT || 8000, () => {
      console.log("connected to database");
      console.log(`server running http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("connection failed", err);
  });
