import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const HofSchema = new mongoose.Schema({
    hof_name:{
        type:String,
        required:true,
        trim:true,
    },
    hof_email:{
        type:String,
        required:true,
        trim:true,
        unique:true
    },
    password: {
        type: String,
        required: true,
        minlength: [8, "Password must be at least 8 characters long"],
        select: false, // Don't return password in queries
    },
    phone_number: {
        type: String,
        trim: true,
    },
    date_of_birth: {
        type: Date,
    },
    // address: {
    //     street: String,
    //     city: String,
    //     state: String,
    //     country: String,
    //     postal_code: String
    // },
    profile_picture: {
        type: String,
        default: "default-profile.jpg"
    },
    gender: {
        type: String,
        enum: ["male", "female", "other", "prefer not to say"],
    },
    marital_status: {
        type: String,
        default:"married",
        enum: ["single", "married", "divorced", "widowed", "other"],
    },
    // occupation: {
    //     type: String,
    //     trim: true,
    // },
    family_created: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Family"
    },
    members_added: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    role: {
        type: String,
        default: "head_of_family",
        enum: ["head_of_family", "admin"]
    }
},{
    timestamps:true
});

HofSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to check if password matches
HofSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get member count
HofSchema.methods.getMemberCount = function() {
    return this.members_added ? this.members_added.length : 0;
};

HofSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.hof_email,
            time:this.createdAt
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
export const Hof = mongoose.model("Hof", HofSchema);