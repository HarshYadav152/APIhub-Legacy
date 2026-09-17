import { Family } from "./family.model.js";
import { Hof } from "../hof/hof.model.js";
import { User } from "../users/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { logger } from "../../config/logger.config.js";
import { withCache, getCacheVersion, bumpCacheVersion } from "../../utils/cache.util.js";

// One scope per family for all cached views (paginated list, hof view,
// member view) — a single bumpCacheVersion() call on any mutation
// invalidates everything cached for that family in one shot, rather
// than needing to enumerate every paginated key combination.
const familyCacheScope = (familyId) => `family:${familyId}`;
const CACHE_TTL_SECONDS = 60;

// Fields projected onto each family member in list/detail responses.
// Was requesting "relationship" and "isActive" — neither exists on the
// User schema (the real fields are relationship_to_hof and is_active) —
// so those two response fields were always undefined.
const MEMBER_PROJECTION =
    "full_name profile_picture email phone_number date_of_birth gender relationship_to_hof is_active";

const formatMember = (member) => ({
    id: member._id,
    name: member.full_name,
    profileImage: member.profile_picture,
    email: member.email,
    phone: member.phone_number,
    dateOfBirth: member.date_of_birth,
    gender: member.gender,
    relationship: member.relationship_to_hof,
    isActive: member.is_active,
});

const createFamily = asyncHandler(async (req, res) => {
    const { fname, fdesc, fpicture, estd } = req.body;
    const hof_id = req.hof._id;

    const existingFamily = await Family.findOne({ head_of_family: hof_id });
    if (existingFamily) {
        throw new ApiError(409, "You have already created a family");
    }

    const family = await Family.create({
        family_name: fname,
        description: fdesc,
        head_of_family: hof_id,
        members: [hof_id],
        family_picture: fpicture,
        establishment_date: estd,
    });

    await Hof.findByIdAndUpdate(hof_id, {
        family_created: family._id,
        $addToSet: { members_added: hof_id },
    });

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                familyCreated: true,
                familyId: family._id,
                memberCount: 1,
            },
            "Family created successfully"
        )
    );
});

const getId = asyncHandler(async (req, res) => {
    const hof = await Hof.findById(req.hof._id);

    if (!hof.family_created) {
        throw new ApiError(404, "You have not created a family yet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { family_id: hof.family_created }, "Family id retrieved"));
});

const addMembers = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const hof_id = req.hof._id;
    logger.debug(`addMembers called for userId: ${userId}`);

    const family = await Family.findOne({ head_of_family: hof_id });
    if (!family) {
        throw new ApiError(404, "Family not found to add members");
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
        throw new ApiError(400, "User does not exist. Please create a user first.");
    }

    if (Array.isArray(family.members)) {
        family.members = family.members.filter((member) => member !== null);
    }

    if (family.hasMember(userId)) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { membersAdded: false, memberCount: family.getMemberCount() },
                    "User is already a member of this family"
                )
            );
    }

    family.addMember(userId);
    await family.save();

    await Hof.findByIdAndUpdate(hof_id, { $addToSet: { members_added: userId } });
    await User.findByIdAndUpdate(userId, { family: family._id, is_active: true });

    await bumpCacheVersion(familyCacheScope(family._id));

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { membersAdded: true, memberCount: family.getMemberCount() },
                "Member added successfully to family"
            )
        );
});

const removeMember = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const hof_id = req.hof._id;

    const family = await Family.findOne({ head_of_family: hof_id });
    if (!family) {
        throw new ApiError(404, "Family not found");
    }

    if (!family.hasMember(userId)) {
        throw new ApiError(400, "Member is not a family member");
    }

    family.removeMember(userId);
    await family.save();

    await Hof.findByIdAndUpdate(hof_id, { $pull: { members_added: userId } });

    // Was `isActive: false` — a field that doesn't exist on the User
    // schema (the real field is `is_active`) — so a removed member was
    // never actually marked inactive.
    await User.findByIdAndUpdate(userId, {
        $unset: { family: 1 },
        is_active: false,
    });

    await bumpCacheVersion(familyCacheScope(family._id));

    return res
        .status(200)
        .json(new ApiResponse(200, { memberRemoved: true }, "Member removed successfully from family"));
});

const getMembersCount = asyncHandler(async (req, res) => {
    const family = await Family.findOne({ head_of_family: req.hof._id });
    if (!family) {
        throw new ApiError(404, "Family not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { memberCount: family.getMemberCount(), familyName: family.family_name },
                "Member count retrieved successfully"
            )
        );
});

const getAllFamilyMembers = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const hof_id = req.hof._id;

    const family = await Family.findOne({ head_of_family: hof_id });
    if (!family) {
        throw new ApiError(404, "Family not found");
    }

    if (Array.isArray(family.members) && family.members.some((m) => m === null)) {
        family.members = family.members.filter((member) => member !== null);
        await family.save();
    }

    const totalMembers = family.members.length;
    const totalPages = Math.max(1, Math.ceil(totalMembers / limit));
    const skip = (page - 1) * limit;

    const scope = familyCacheScope(family._id);
    const version = await getCacheVersion(scope);
    const cacheKey = `${scope}:v${version}:members:page:${page}:limit:${limit}`;

    const formattedMembers = await withCache(cacheKey, CACHE_TTL_SECONDS, async () => {
        const populatedFamily = await Family.findById(family._id)
            .populate({
                path: "members",
                select: MEMBER_PROJECTION,
                options: { sort: { full_name: 1 }, skip, limit },
            })
            .select("members");

        return populatedFamily.members.map(formatMember);
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                familyName: family.family_name,
                members: formattedMembers,
                pagination: {
                    page,
                    limit,
                    totalMembers,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            },
            "Family members retrieved successfully"
        )
    );
});

const viewFamilyAsMember = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select("family").lean();
    if (!user?.family) {
        throw new ApiError(404, "You are not associated with any family");
    }

    const scope = familyCacheScope(user.family);
    const version = await getCacheVersion(scope);
    const cacheKey = `${scope}:v${version}:member-view`;

    const formattedFamily = await withCache(cacheKey, CACHE_TTL_SECONDS, async () => {
        const family = await Family.findById(user.family)
            .populate({ path: "head_of_family", select: "hof_name profile_picture" })
            .select("family_name family_picture establishment_date description members")
            .lean();

        if (!family) {
            throw new ApiError(404, "Family not found");
        }

        return {
            familyName: family.family_name,
            familyPicture: family.family_picture,
            establishmentDate: family.establishment_date,
            description: family.description,
            headOfFamily: {
                name: family.head_of_family.hof_name,
                profilePicture: family.head_of_family.profile_picture,
            },
            memberCount: family.members?.length ?? 0,
        };
    });

    return res
        .status(200)
        .json(new ApiResponse(200, formattedFamily, "Family details retrieved successfully"));
});

const viewFamilyAsHof = asyncHandler(async (req, res) => {
    const hofId = req.hof._id;

    const family = await Family.findOne({ head_of_family: hofId })
        .select("family_name family_picture description establishment_date")
        .lean();

    if (!family) {
        throw new ApiError(404, "You have not created a family yet");
    }

    const scope = familyCacheScope(family._id);
    const version = await getCacheVersion(scope);
    const cacheKey = `${scope}:v${version}:hof-view`;

    const formattedFamily = await withCache(cacheKey, CACHE_TTL_SECONDS, async () => {
        const populatedFamily = await Family.findById(family._id).populate({
            path: "members",
            select: MEMBER_PROJECTION,
            options: { sort: { full_name: 1 } },
        });

        const hofDetails = await Hof.findById(hofId)
            .select("hof_name profile_picture hof_email phone_number date_of_birth gender")
            .lean();

        return {
            id: family._id,
            familyName: family.family_name,
            description: family.description,
            familyPicture: family.family_picture,
            establishmentDate: family.establishment_date,
            headOfFamily: {
                id: hofId,
                name: hofDetails.hof_name,
                email: hofDetails.hof_email,
                profilePicture: hofDetails.profile_picture,
                phone: hofDetails.phone_number,
                dateOfBirth: hofDetails.date_of_birth,
                gender: hofDetails.gender,
            },
            memberCount: populatedFamily.members.length,
            members: populatedFamily.members.map(formatMember),
        };
    });

    return res
        .status(200)
        .json(new ApiResponse(200, formattedFamily, "Family details retrieved successfully"));
});

export {
    createFamily,
    addMembers,
    removeMember,
    getMembersCount,
    getAllFamilyMembers,
    viewFamilyAsHof,
    viewFamilyAsMember,
    getId,
};
