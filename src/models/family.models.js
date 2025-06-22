import mongoose from "mongoose";

const FamilySchema = new mongoose.Schema({
    family_name: {
        type: String,
        required: [true, "Family name is required"],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    head_of_family: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HOF",
        required: [true, "Head of family is required"]
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    family_picture: {
        type: String,
        default: "default-family.jpg"
    },
    // address: {
    //     street: String,
    //     city: String,
    //     state: String,
    //     country: String,
    //     postal_code: String
    // },
    establishment_date: {
        type: Date,
        default: Date.now
    },
    // family_traditions: [{
    //     name: String,
    //     description: String,
    //     date: Date
    // }],
    // family_events: [{
    //     title: String,
    //     description: String,
    //     date: Date,
    //     location: String,
    //     attendees: [{
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: "User"
    //     }]
    // }],
    is_active: {
        type: Boolean,
        default: true
    }
},{
    timestamps:true
});

// Method to get member count
FamilySchema.methods.getMemberCount = function() {
    return this.members ? this.members.length : 0;
};

// Method to check if user is a member of the family
FamilySchema.methods.hasMember = function(userId) {
    return this.members.some(member => member.toString() === userId.toString());
};

// Method to add a member to the family
FamilySchema.methods.addMember = function(userId) {
    if (!this.hasMember(userId)) {
        this.members.push(userId);
    }
    return this;
};

// Method to remove a member from the family
FamilySchema.methods.removeMember = function(userId) {
    this.members = this.members.filter(member => member.toString() !== userId.toString());
    return this;
};
export const Family = mongoose.model("Family", FamilySchema);