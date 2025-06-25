import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"

const generateUAccessToken = async (userID) => {
    try {
        const user = await User.findById(userID)
        const UaccessToken = user.generateAccessToken();
        return { UaccessToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating AT.");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // register with minimal details when an user want to join a family ask them to provide more details
    const {
        uname,
        uemail,
        upassword
    } = req.body;

    if ([uname, uemail, upassword].some((field) => field?.trim() === '')) {
        throw new ApiError(400, "All user fields are required.")
    }
    const existedUser = await User.findOne({
        $or: [{ email: uemail }]
    })

    if (existedUser) {
        throw new ApiError(409, "User already existed with this email...")
    }

    const user = await User.create({
        full_name: uname,
        email: uemail,
        password: upassword,
    })
    const createdUser = await User.findOne(user._id);
    if (!createdUser) {
        throw new ApiError(409, "Something wrong while creating user...")
    }

    return res.status(201).json(
        new ApiResponse(200, {}, "User created successfully.")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    const { uemail, upassword } = req.body;

    const member = await User.findOne({ email: uemail }).select("+password"); // we have to explictly select password

    if (!member) {
        throw new ApiError(409, "User not existed. Please create one...")
    }
    const verifyPassword = await member.comparePassword(upassword)

    if (!verifyPassword) {
        throw new ApiError(401, "Invalid credentials. Try with different (you have only 3 attempts and you will temporary blocked.)")
    }
    const { UaccessToken } = await generateUAccessToken(member._id)

    const options = {
        httpOnly: true,
        secure: true
    }
    res.setHeader('Authorization', `Bearer ${UaccessToken}`);
    return res.status(200)
        .cookie("UaccessToken", UaccessToken, options)
        .json(new ApiResponse(200, { UaccessToken }, "user logged in successfully..."))
})

const completeMemberProfile = asyncHandler(async(res,req)=>{
    
})

export {
    registerUser,
    loginUser,
    completeMemberProfile
}