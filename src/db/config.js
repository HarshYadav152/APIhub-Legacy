import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"

const connectingtoDB = async()=>{
    try {
        const connectionInstance = await mongoose.connect(`mongodb://localhost:27017/${DB_NAME}`)
        console.log(`MongoDB connected At HOST :: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("Failed to connect to MONGODB : ",error);
        process.exit(1);
    }
}

export default connectingtoDB;