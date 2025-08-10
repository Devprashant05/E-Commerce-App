import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.DB_URL}/${DB_NAME}`
        );
        console.log(
            `Successfully DB Connected! : Host - ${connectionInstance.connection.host}`
        );
    } catch (error) {
        console.error(`MongoDB Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
