import "./MembersList.css";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
export default function MembersList() {
  const totalMembers = 12;

  return (
    <div className="members-list-container">
      <div className="members-list">
        {/* Header */}
        <div className="members-header">
          <h3>Members</h3>
          <span className="members-count">{totalMembers}</span>
        </div>
        {/*  */}
        <div className="members-content">
          {/* ADMINISTRATORS Section */}
          <div className="admin">
            <div className="section-title">
              <span>ADMINISTRATORS — 1</span>
            </div>

            {/* User-4 */}
            <div className="member-item">
              <div className="member-avatar">
                <img src="/user.jpg" alt="user-avatar" />
                <span className="status-dot"></span>
              </div>
              <div className="member-info">
                <span className="member-name">User-4</span>
                <span className="member-status">Co-founder</span>
              </div>
            </div>
          </div>
          {/*  */}
          {/* MEMBERS Section */}
          <div className="members">
            <div className="section-title">
              <span>MEMBERS — 11</span>
            </div>

            {/* User-2 */}
            <div className="member-item">
              <div className="member-avatar">
                <img src="/user.jpg" alt="user-avatar" />
              </div>
              <div className="member-info">
                <span className="member-name">User-2</span>
              </div>
            </div>

            {/* User-1 - Online */}
            <div className="member-item">
              <div className="member-avatar">
                <img src="/user.jpg" alt="user-avatar" />
                <span className="status-dot"></span>
              </div>
              <div className="member-info">
                <span className="member-name">User-1</span>
              </div>
            </div>

            {/* User-5 - In a meeting */}
            <div className="member-item">
              <div className="member-avatar">
                <img src="/user.jpg" alt="user-avatar" />
                <span className="status-dot"></span>
              </div>
              <div className="member-info">
                <span className="member-name">User-5</span>
                <span className="member-status">in a meeting</span>
              </div>
            </div>

            {/* User-6 - Offline */}
            <div className="member-item offline-member">
              <div className="member-avatar">
                <img src="/user.jpg" alt="user-avatar" />
              </div>
              <div className="member-info">
                <span className="member-name">User-6</span>
              </div>
            </div>

            {/* User-7 - Offline */}
            <div className="member-item offline-member">
              <div className="member-avatar">
                <img src="/user.jpg" alt="user-avatar" />
                <span className="status-dot"></span>
              </div>
              <div className="member-info">
                <span className="member-name">User-7</span>
              </div>
            </div>
          </div>
        </div>
        {/*  */}
        {/* Invite Button */}
        <div className="invite-section">
          <button className="invite-btn">
            <PersonAddAltOutlinedIcon></PersonAddAltOutlinedIcon>
            <span>Invite Member</span>
          </button>
        </div>
      </div>
    </div>
  );
}
