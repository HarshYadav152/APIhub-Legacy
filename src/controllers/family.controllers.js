import { Family } from "../models/family.models.js";
import { Hof } from "../models/hof.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js"

const createFamily = asyncHandler(async (req, res) => {
    const { fname, fdesc, fpicture, estd } = req.body;
    const hof_id = req.hof._id;

    if ([fname, fdesc, fpicture, estd].some((field) => field?.trim() === 0)) {
        throw new ApiError(409, "Family details is required...")
    }

    try {
        const creator = await Hof.findById(hof_id);
        if (!creator) {
            throw new ApiError(404, "Hof is not found...")
        }
        await Family.create({
            family_name: fname,
            description: fdesc,
            head_of_family: hof_id,
            // members:
            family_picture: fpicture,
            establishment_date: estd,
        })

        return res.status(201).json(
            new ApiResponse(201, { familyCreated: true }, "Family created successfully...")
        )
    } catch (error) {
        throw new ApiError(500, {
            familyCreated: false,
            "message": error
        });
    }
});

const addMembers = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const hof_id = req.hof._id;

    try {
        const family = await Family.findOne({
            head_of_family: hof_id
        })
        if (!family) {
            throw new ApiError(409, { "message": "Family not found to add members..." });
        }

        family.addMember(userId);
        await family.save();

        return res.status(200).json(
            new ApiResponse(200, { membersAdded: true }, "Member added successfully to family...")
        );
    } catch (error) {
        throw new ApiError(500, "Error adding member to family : " + error.message);
    }

});

const removeMembers = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const hof_id = req.hof._id;

    try {
        const family = await Family.findOne({
            head_of_family: hof_id
        });

        if (!family) {
            throw new ApiError(404, "Family not found");
        }

        // Check if user is a member before removing
        if (!family.hasMember(userId)) {
            throw new ApiError(400, "User is not a member of this family");
        }

        family.removeMember(userId);
        await family.save();

        return res.status(200).json(
            new ApiResponse(200, { memberRemoved: true }, "Member removed successfully from family")
        );
    } catch (error) {
        throw new ApiError(500, "Error removing member from family: " + error.message);
    }
});

const getMembersCount = asyncHandler(async (req, res) => {
    const hof_id = req.hof._id;

    try {
        const family = await Family.findOne({
            head_of_family: hof_id
        });

        if (!family) {
            throw new ApiError(404, "Family not found");
        }

        const count = family.getMemberCount();

        return res.status(200).json(
            new ApiResponse(200, {
                memberCount: count,
                familyName: family.family_name
            }, "Member count retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Error getting member count: " + error.message);
    }
});

const getAllFamilyMembers = asyncHandler(async (req, res) => {
    const hof_id = req.hof._id;

    try {
        // Find the family associated with this HOF
        const family = await Family.findOne({
            head_of_family: hof_id
        });

        if (!family) {
            throw new ApiError(404, "Family not found");
        }

        // Populate the members array with user details
        // Assuming User model has relevant fields like name, profile_picture, etc.
        const populatedFamily = await Family.findById(family._id)
            .populate({
                path: 'members',
                select: 'name profile_picture email phone_number date_of_birth gender relationship',
                options: { sort: { name: 1 } } // Sort by name alphabetically
            })
            .select('family_name members');

        if (!populatedFamily) {
            throw new ApiError(500, "Error retrieving family members");
        }

        // Format the response for frontend consumption
        const formattedMembers = populatedFamily.members.map(member => ({
            id: member._id,
            name: member.name,
            profileImage: member.profile_picture,
            email: member.email,
            phone: member.phone_number,
            dateOfBirth: member.date_of_birth,
            gender: member.gender,
            relationship: member.relationship
        }));

        return res.status(200).json(
            new ApiResponse(200, {
                familyName: populatedFamily.family_name,
                memberCount: formattedMembers.length,
                members: formattedMembers
            }, "Family members retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Error retrieving family members: " + error.message);
    }
})

const viewFamily = asyncHandler(async (req, res) => {

});

const modifyFamily = asyncHandler(async (req, res) => {

});

const removeFamily = asyncHandler(async (req, res) => {

});

export {
    createFamily,
    addMembers,
    removeMembers,
    getMembersCount,
    viewFamily,
    modifyFamily,
    removeFamily,
}