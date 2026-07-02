import "./MembersList.css";
import { useEffect, useState } from "react";
import { getCurrentUserId } from "../../../../utils/auth";

export default function MembersList({ activeChannel, usersMap = {} }) {
  // Real membership (member user IDs + the admin/creator) for the active
  // channel, fetched from the backend whenever the selected channel changes.
  const [channelDetails, setChannelDetails] = useState(null);
  const currentUserId = getCurrentUserId();

 

  useEffect(() => {
    if (!activeChannel?.id) {
      setChannelDetails(null);
      return;
    }

    let cancelled = false;
    const fetchChannelMembers = async () => {
      try {
        const res = await fetch(`/api/chat/channels/${activeChannel.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": String(getCurrentUserId()),
            "X-User-Role": "USER",
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setChannelDetails(data);
        } else if (!cancelled) {
          setChannelDetails(null);
        }
      } catch (err) {
        console.error("Failed to load channel members:", err);
        if (!cancelled) setChannelDetails(null);
      }
    };

    fetchChannelMembers();
    return () => {
      cancelled = true;
    };
  }, [activeChannel?.id]);

  const memberIds = channelDetails?.members || [];
  const adminId = channelDetails?.createdBy ?? null;

  // The admin/creator is shown in its own section; everyone else is a member.
  const adminIds =
    adminId != null && memberIds.includes(adminId) ? [adminId] : [];
  const regularMemberIds = memberIds.filter((id) => id !== adminId);
  const totalMembers = memberIds.length;

  const resolveName = (id) => usersMap[id] || `User ${id}`;

  const renderMember = (id) => {
    const isCurrentUser = String(id) === String(currentUserId);
    return (
      <div className="member-item" key={id}>
        <div className="member-avatar">
          <img src="/user.jpg" alt="user-avatar" />
          {/* No presence backend yet — only the logged-in user is known online */}
          {isCurrentUser && <span className="status-dot"></span>}
        </div>
        <div className="member-info">
          <span className="member-name">{resolveName(id)}</span>
          {isCurrentUser && <span className="member-status">You</span>}
        </div>
       
      </div>
    );
  };

  return (
    <div className="members-list-container">
      <div className="members-list">
        {/* Header */}
        <div className="members-header">
          <h3>Members</h3>
          <span className="members-count">{totalMembers}</span>
        </div>

        <div className="members-content">
          {!activeChannel ? (
            <div className="section-title">
              <span>SELECT A CHANNEL</span>
            </div>
          ) : (
            <>
              {/* ADMINISTRATORS Section */}
              {adminIds.length > 0 && (
                <div className="admin">
                  <div className="section-title">
                    <span>ADMINISTRATORS — {adminIds.length}</span>
                  </div>
                  {adminIds.map(renderMember)}
                </div>
              )}

              {/* MEMBERS Section */}
              <div className="members">
                <div className="section-title">
                  <span>MEMBERS — {regularMemberIds.length}</span>
                </div>
                {regularMemberIds.length > 0 ? (
                  regularMemberIds.map(renderMember)
                ) : (
                  <span className="member-status">No other members yet</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Invite Button */}
        {/* <div className="invite-section">
          <button className="invite-btn">
            <PersonAddAltOutlinedIcon></PersonAddAltOutlinedIcon>
            <span>Invite Member</span>
          </button>
        </div> */}
      </div>

    </div>
  );
}
