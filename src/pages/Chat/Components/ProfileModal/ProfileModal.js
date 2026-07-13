import "./ProfileModal.css";
import { X, Mail, Briefcase, Users2, Shield } from "lucide-react";

const ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member", GUEST: "Guest" };

/** Lightweight profile card shown when an @mention is clicked. */
export default function ProfileModal({ member, onClose }) {
  if (!member) return null;
  const initials =
    (member.name || "?")
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-card" onClick={(e) => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="profile-head">
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
          <div className="profile-id">
            <h3>{member.name}</h3>
            {member.title && <span className="profile-title">{member.title}</span>}
          </div>
        </div>

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
