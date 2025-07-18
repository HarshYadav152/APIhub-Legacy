import { Hof } from "../models/hof.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadingFileonCloudinary } from "../utils/services/fileUpload/cloudinary.services.js";

const generateHAccessToken = async (hofID) => {
    try {
        const hof = await Hof.findById(hofID)
        const HaccessToken = hof.generateAccessToken();
        return { HaccessToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong. While generating hof accesstoken...");
    }
}

const registerHOF = asyncHandler(async (req, res) => {
    const {
        name,
        email,
        password
    } = req.body;

    if ([name, email, password].some((field) => field?.trim() === 0)) {
        throw new ApiError(409, "All fields are mandatory. for hof creation..")
    }

    const existedHof = await Hof.findOne({ hof_email: email })

    if (existedHof) {
        throw new ApiError(409, "Head of family already existed with same email.")
    }

    const hof = await Hof.create({
        hof_name: name,
        hof_email: email,
        password
        // occupation,
        // to be added after creating account (family)
        // to be added after creating account (Members)
    })

    const createdHof = await Hof.findById(hof._id).select(
        "-password"
    )
    if (!createdHof) {
        throw new ApiError(409, "There is some mistake in creating Hof at our end. Please try again.")
    }

    return res.status(201).json(
        new ApiResponse(200, {}, "User created successfully.")
    )
})

const entryHOF = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const hof = await Hof.findOne({ hof_email: email }).select("+password");
    if (!hof) {
        throw new ApiError(409, "Head of family not existed. Please create one...")
    }

    const verifyPassword = await hof.comparePassword(password);

    if (!verifyPassword) {
        throw new ApiError(401, "Invalid credentials. Try again...");
    }

    const { HaccessToken } = await generateHAccessToken(hof._id);

    const options = {
        httpOnly: true,
        secure: true
    }
    res.setHeader('Authorization', `Bearer ${HaccessToken}`);
    return res.status(200)
        .cookie("HaccessToken", HaccessToken, options)
        .json(new ApiResponse(200, { HaccessToken, hof_id: hof._id }, "User logged in successfully"))
})

const completeHofProfile = asyncHandler(async (req, res) => {
    const hofId = req.hof._id;
    const { number, dob, gender, mstatus } = req.body;

    if ([number, dob, gender, mstatus].some((field) => field?.trim() === "")) {
        return res.status(400).json(
            new ApiResponse(400, { success: false }, "All Hof fields are required")
        )
    }

    const pictureLocalPath = req.file?.path;
    if (!pictureLocalPath) {
        return res.status(400).json(
            new ApiResponse(400, null, "Hof Profile picture is required..")
        )
    }

    const avatar = await uploadingFileonCloudinary(pictureLocalPath)
    if (!avatar) {
        return res.status(400).json(
            new ApiResponse(400, null, "HOf Profile picture not found or failed to uploading...")
        )
    }

    const updatedHof = await Hof.findByIdAndUpdate(
        hofId,
        {
            phone_number: number,
            date_of_birth: dob,
            gender: gender,
            marital_status: mstatus,
            profile_picture:avatar.url
        },
        { new: true, runValidators: true }
    ).select(" -password");

    if (!updatedHof) {
        return res.status(404).json(
            new ApiResponse(404, null, "Hof not found. for updating profile...")
        );
    }
    return res.status(200).json(
        new ApiResponse(200, updatedHof, "Hof Profile updated successfully")
    );
})
export {
    registerHOF,
    entryHOF,
    completeHofProfile
}