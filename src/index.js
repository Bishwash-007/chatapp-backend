import dotenv from "dotenv";
import { app } from "./app.js";
import connectToDatabase from "./db/db.js";

dotenv.config({
  path: ".env",
});

connectToDatabase()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log("connected to database");
      console.log(`server running http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("connection failed", err);
  });
