import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { env } from "../../config/env.config.js";
import { logger } from "../../config/logger.config.js";

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

const uploadingFileonCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            logger.warn("uploadingFileonCloudinary called without a file path");
            return null;
        }

        if (!fs.existsSync(localFilePath)) {
            logger.warn(`File does not exist at path: ${localFilePath}`);
            return null;
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: "apihub_profiles",
        });

        logger.info(`File uploaded to Cloudinary: ${response.url}`);

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return response;
    } catch (error) {
        logger.error("Cloudinary upload error:", error);

        if (localFilePath && fs.existsSync(localFilePath)) {
            try {
                fs.unlinkSync(localFilePath);
            } catch (unlinkError) {
                logger.error("Failed to delete temp file after failed upload:", unlinkError);
            }
        }

        return null;
    }
};

export { uploadingFileonCloudinary };
