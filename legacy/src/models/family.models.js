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
    if (!userId || !this.members) return false;
    
    const userIdStr = userId.toString();
    
    return this.members.some(member => {
        if (!member) return false;
        
        try {
            return member.toString() === userIdStr;
        } catch (error) {
            return false;
        }
    });
};

// Method to add a member to the family
FamilySchema.methods.addMember = function(userId) {
    if (!userId) {
        console.warn('Attempted to add null/undefined user ID');
        return this;
    }
    
    // Convert string IDs to ObjectId if necessary
    let userObjectId;
    try {
        if (typeof userId === 'string') {
            userObjectId = new mongoose.Types.ObjectId(userId);
        } else if (userId instanceof mongoose.Types.ObjectId) {
            userObjectId = userId;
        } else {
            userObjectId = userId; // Assume it's already in the correct format
        }
        
        // Only add if not already a member
        if (!this.hasMember(userObjectId)) {
            this.members.push(userObjectId);
        }
    } catch (error) {
        console.error('Invalid user ID format:', error);
    }
    
    return this;
};

// Method to remove a member from the family
FamilySchema.methods.removeMember = function(userId) {
    // Convert userId to string once for comparison
    const userIdStr = userId.toString();

    // this.members = this.members.filter(member => member.toString() !== userId.toString());
    this.members = this.members.filter(member=>{
        if(!member) return true;

        try{
            return member.toString() !== userIdStr;
        }catch(error){
            return true;
        }
    });
    return this;
};
export const Family = mongoose.model("Family", FamilySchema);