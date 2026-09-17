import { Message } from "./message.model.js";
import { assertSameFamily } from "./messaging.service.js";
import { emitToAccount } from "../../realtime/socket.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const formatMessage = (message) => ({
    id: message._id,
    senderType: message.senderType,
    senderId: message.sender,
    recipientType: message.recipientType,
    recipientId: message.recipient,
    ciphertext: message.ciphertext,
    messageType: message.messageType,
    sentAt: message.createdAt,
    deliveredAt: message.deliveredAt ?? null,
    readAt: message.readAt ?? null,
});

const sendMessage = asyncHandler(async (req, res) => {
    const requester = req.account;
    const { recipientType, recipientId, ciphertext, messageType } = req.body;

    const family = await assertSameFamily(requester, { type: recipientType, id: recipientId });

    const message = await Message.create({
        family: family._id,
        senderType: requester.type,
        sender: requester.id,
        recipientType,
        recipient: recipientId,
        ciphertext,
        messageType,
    });

    // Best-effort real-time push — see socket.service.js for why this
    // is never a delivery guarantee. The recipient's next conversation
    // fetch is the actual source of truth.
    emitToAccount(recipientType, recipientId, "message:new", formatMessage(message));

    return res
        .status(201)
        .json(new ApiResponse(201, { messageId: message._id, sentAt: message.createdAt }, "Message sent"));
});

const getConversation = asyncHandler(async (req, res) => {
    const requester = req.account;
    const { withAccountType, withAccountId } = req.params;
    const { page, limit } = req.query;

    await assertSameFamily(requester, { type: withAccountType, id: withAccountId });

    const filter = {
        $or: [
            {
                senderType: requester.type,
                sender: requester.id,
                recipientType: withAccountType,
                recipient: withAccountId,
            },
            {
                senderType: withAccountType,
                sender: withAccountId,
                recipientType: requester.type,
                recipient: requester.id,
            },
        ],
    };

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
        Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Message.countDocuments(filter),
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                // Most-recent-first is the natural fetch order for
                // pagination (page 1 = newest); reversed here so each
                // page reads oldest-to-newest, like a chat log.
                messages: messages.reverse().map(formatMessage),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / limit)),
                },
            },
            "Conversation retrieved"
        )
    );
});

const markMessageRead = asyncHandler(async (req, res) => {
    const requester = req.account;
    const { messageId } = req.params;

    const message = await Message.findOne({
        _id: messageId,
        recipientType: requester.type,
        recipient: requester.id,
    });

    if (!message) {
        throw new ApiError(404, "Message not found");
    }

    if (!message.readAt) {
        message.readAt = new Date();
        await message.save();
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { messageId: message._id, readAt: message.readAt }, "Message marked as read")
        );
});

export { sendMessage, getConversation, markMessageRead };
