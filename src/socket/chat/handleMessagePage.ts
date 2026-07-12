import { Socket } from 'socket.io';
import conversations from '../../module/conversation/conversation.model';
import { getSocketIO, onlineUsers } from '../connectSocket';
import messages from '../../module/message/message.model';


export const handleMessagePage = async (
  socket: Socket,
  currentUserId: string,
  data: any,
) => {
  try {
    const { conversationId } = data;

    if (!conversationId) {
      return socket.emit('socket-error', {
        event: 'message-page',
        message: 'conversationId is required',
      });
    }

    const conversation = await conversations.findById(conversationId).populate(
      'participants',
      '-password',
    );

    if (!conversation) {
      return socket.emit('socket-error', {
        event: 'message-page',
        message: 'Conversation not found',
      });
    }

    const otherUser: any = conversation.participants.find(
      (u: any) => u._id.toString() !== currentUserId,
    );

    if (!otherUser) {
      return socket.emit('socket-error', {
        event: 'message-page',
        message: 'Other participant not found',
      });
    }

    const payload = {
      receiverId: otherUser._id,
      name: otherUser.name,
      profileImage: otherUser?.photo,
      online: onlineUsers.has(otherUser._id.toString()),
    };

    socket.emit('message-user', payload);

    // Fetch ALL messages for this conversation, oldest first
    const allMessages = await messages
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .lean();

    // Mark unseen messages from the other user as seen
    const unseenMessages = allMessages.filter(
      (msg: any) =>
        msg.msgByUserId.toString() === otherUser._id.toString() && !msg.seen,
    );

    if (unseenMessages.length > 0) {
      const messageIds = unseenMessages.map((msg: any) => msg._id);

      await messages.updateMany(
        { _id: { $in: messageIds } },
        { $set: { seen: true } },
      );

      const io = getSocketIO();

      io.to(conversationId.toString()).emit('messages-seen', {
        conversationId,
        seenBy: currentUserId,
        messageIds,
      });
    }

    socket.emit('messages', {
      conversationId,
      userData: payload,
      messages: allMessages,
    });

    await socket.join(conversationId.toString());
    socket.data.currentConversationId = conversationId;
  } catch (error: any) {
    console.error('handleMessagePage error:', error);
    socket.emit('socket-error', {
      event: 'message-page',
      message: error?.message || 'Failed to load messages',
    });
  }
};
