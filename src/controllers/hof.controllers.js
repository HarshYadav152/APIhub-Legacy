import { Hof } from "../models/hof.models.js";
import { ApiError } from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js"

const registerHOF = asyncHandler(async(req,res)=>{
    const {
        name,
        email,
        password,
        phone,
        dob,
        // address,
        picture,
        gender,
        married,
        // occupation,
    } = req.body;

    if([name,email,password,phone,dob,gender,married].some((field)=>field?.trim()===0)){
        throw new ApiError(409,"All fields are mandatory. for hof creation..")
    }

    const existedHof = await Hof.findOne({
        $or : {email}
    })
    if(existedHof){
        throw new ApiError(409,"Head of family already existed with same email.")
    }

    const hof = await Hof.create({
        hof_name:name,
        hof_email:email,
        password,
        phone_number:phone,
        date_of_birth:dob,
        // address,
        profile_picture:picture,
        gender,
        marital_status:married,
        // occupation,
        // to be added after creating account (family)
        // to be added after creating account (Members)
    })

    const createdHof = await Hof.findById(hof._id).select(
        "-password"
    )
    if(!createdHof){
        throw new ApiError(409,"There is some mistake in creating Hof at our end. Please try again.")
    }

    return res.status(201).json(
        new ApiResponse(200, {}, "User created successfully.")
    )
})

const entryHOF = asyncHandler(async(req,res)=>{

})

export {
    registerHOF,
    entryHOF
}