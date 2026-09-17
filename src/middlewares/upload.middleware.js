import multer from "multer";
import path from "path";
import fs from "fs";
import { MAX_UPLOAD_SIZE_BYTES } from "../config/constants.js";
import { logger } from "../config/logger.config.js";

// Create temp directory if it doesn't exist
const tempDir = "./public/temp";
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    logger.info(`Created temp upload directory: ${tempDir}`);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
});

// Filter to accept only images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only images are allowed!"), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
});
