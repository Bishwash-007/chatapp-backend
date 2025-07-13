import mongoose from "mongoose";

const connectToDatabase = async () => {
  try {
    await mongoose.connect(`${process.env.MONGO_DB_URI}`);
  } catch (error) {
    console.log("Something Went Wrong", error);
    process.exit(1);
  }
};

export default connectToDatabase;
