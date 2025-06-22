import { ApiError } from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js"

const createFamily = asyncHandler(async()=>{
    const {name,desc,picture,estd} = req.body;

    if([name,desc,picture,estd].some((field)=>field?.trim()===0)){
        throw new ApiError(409,"")
    }
})

const viewFamily = asyncHandler(async()=>{

})

const modifyFamily = asyncHandler(async()=>{

})

const removeFamily = asyncHandler(async()=>{

})

export {
    createFamily,
    viewFamily,
    modifyFamily,
    removeFamily
}