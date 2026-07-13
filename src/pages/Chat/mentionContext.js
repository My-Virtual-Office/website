import { createContext, useContext } from "react";

/**
 * Lets any <Message> reach chat-level actions without prop-drilling through
 * ChatArea/MessagesList/ThreadPanel.
 *   onMention(handle)              -> open that user's profile
 *   onChannel(name)                -> jump to that channel
 *   onMarkUnread(channelId, msgId) -> mark the channel unread from a message
 */
export const MentionContext = createContext({
  onMention: null,
  onChannel: null,
  onMarkUnread: null,
});

export const useMentions = () => useContext(MentionContext);
