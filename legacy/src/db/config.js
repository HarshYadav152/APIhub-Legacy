import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"
import dotenv from "dotenv";
dotenv.config({
    path:"./.env"
});
console.log(process.env.MONGODB_URI)

const connectingtoDB = async()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`MongoDB connected At HOST :: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("Failed to connect to MONGODB : ",error);
        process.exit(1);
    }
}

export default connectingtoDB;