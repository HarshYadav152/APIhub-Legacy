import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadingFileonCloudinary = async(localFilePath) => {
    try {
        console.log("Start uploading on cloudinary..");
        
        if (!localFilePath) {
            console.error("File path is undefined");
            return null;
        }
        
        // Check if file exists before uploading
        if (!fs.existsSync(localFilePath)) {
            console.error("File does not exist at path:", localFilePath);
            return null;
        }
        
        // Upload files on cloudinary with folder structure
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
            folder: 'apihub_profiles' // Organize uploads in a folder
        });
        
        console.log("File uploaded successfully at:", response.url);
        
        // Safely delete the temp file
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        
        return response;
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        
        // Safely delete the temp file
        if (localFilePath && fs.existsSync(localFilePath)) {
            try {
                fs.unlinkSync(localFilePath);
            } catch (unlinkError) {
                console.error("Failed to delete temp file:", unlinkError);
            }
        }
        
        return null;
    }
};

export { uploadingFileonCloudinary };