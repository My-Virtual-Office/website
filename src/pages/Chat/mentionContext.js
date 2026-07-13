import { createContext, useContext } from "react";

/**
 * Lets any <Message> make @mention / #channel pills actionable without
 * prop-drilling through ChatArea/MessagesList/ThreadPanel.
 *   onMention(handle) -> open that user's profile
 *   onChannel(name)   -> jump to that channel
 */
export const MentionContext = createContext({ onMention: null, onChannel: null });

export const useMentions = () => useContext(MentionContext);
