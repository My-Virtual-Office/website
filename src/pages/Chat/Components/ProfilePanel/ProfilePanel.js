import "./ProfilePanel.css";
import { X, Mail, Briefcase, Users2, Shield, MessageSquare } from "lucide-react";
import { getCurrentUserId } from "../../../../utils/auth";

const ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member", GUEST: "Guest" };

/** Right-side profile panel with a "Message" action to open a DM. */
export default function ProfilePanel({ member, onClose, onMessage }) {
  if (!member) return null;
  const isMe = member.userId === getCurrentUserId();
  const initials =
    (member.name || "?")
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="profile-panel">
      <div className="profile-panel-head">
        <span className="profile-panel-title">Profile</span>
        <button className="profile-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>

      <div className="profile-panel-body">
        <div className="profile-avatar">
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} />
          ) : (
            <span>{initials}</span>
          )}
          {member.online != null && (
            <span className={`profile-presence ${member.online ? "on" : "off"}`} />
          )}
        </div>

        <h3 className="profile-name">{member.name}</h3>
        {member.title && <span className="profile-title">{member.title}</span>}

        {!isMe && (
          <button className="profile-message-btn" onClick={() => onMessage(member)}>
            <MessageSquare size={16} /> Message
          </button>
        )}

        <div className="profile-rows">
          {member.email && member.email !== "—" && (
            <div className="profile-row">
              <Mail size={15} />
              <a href={`mailto:${member.email}`}>{member.email}</a>
            </div>
          )}
          {member.title && (
            <div className="profile-row">
              <Briefcase size={15} />
              <span>{member.title}</span>
            </div>
          )}
          {member.team && member.team !== "—" && (
            <div className="profile-row">
              <Users2 size={15} />
              <span>{member.team}</span>
            </div>
          )}
          {member.role && (
            <div className="profile-row">
              <Shield size={15} />
              <span>{ROLE_LABEL[member.role] || member.role}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
