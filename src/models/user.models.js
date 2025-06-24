import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const UserSchema = new mongoose.Schema({
    full_name: {
        type: String,
        required: [true, "Name is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, "Password must be at least 8 characters long"],
        select: false
    },
    phone_number: {
        type: String,
        trim: true
    },
    date_of_birth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ["male", "female", "other", "prefer not to say"]
    },
    address: {
        street: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        country: { type: String, default: "" },
        postal_code: { type: String, default: "" }
    },
    profile_picture: {
        type: String,
        default: "default-user.jpg"
    },
    relationship_status: {
        type: String,
        enum: ["single", "married", "divorced", "widowed", "other"]
    },
    // occupation: {
    //     type: String,
    //     trim: true,
    //     default: "Not Specified"
    // },
    education: {
        institution: { type: String, default: "Not specified" },
        degree: { type: String, default: "Not specified" },
        field: { type: String, default: "Not specified" },
        graduation_year: { type: Number, default: null }
    },
    family: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Family"
    },
    relationship_to_hof: {
        type: String,
        enum: ["spouse", "child", "sibling", "parent", "grandparent", "grandchild", "other"]
    },
    role: {
        type: String,
        default: "family_member",
        enum: ["family_member", "admin"]
    },
    emergency_contact: {
        name: String,
        relation: String,
        phone: String,
        email: String
    },
    medical_info: {
        blood_type: String,
        allergies: [String],
        medical_conditions: [String],
        medications: [String]
    },
    is_active: {
        type: Boolean,
        default: false
    },
    last_login: {
        type: Date
    }
}, {
    timestamps: true
});

// Password hashing middleware
UserSchema.pre("save", async function (next) {
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
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update last login
UserSchema.methods.updateLastLogin = function () {
    this.last_login = new Date();
    return this.save();
};

// Method to calculate age
UserSchema.methods.getAge = function () {
    if (!this.date_of_birth) return null;
    const today = new Date();
    const birthDate = new Date(this.date_of_birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            time: this.createdAt
        },
        // process.env.ACCESS_TOKEN_SECRET,
        '523eyfdeiwxtqv4r34tqt4tr9q3xy4r9834yfioerhfiorygf9v',
        {
            // expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
            expiresIn:'1d'
        }
    )
}

export const User = mongoose.model("User", UserSchema);