// import { useState } from "react";
// import { getUserProfile } from "../../api/user";

import { Link } from "react-router-dom";
import { MessageSquare, LayoutGrid, UserPlus, ArrowRight, Sparkles } from "lucide-react";
import logoWide from "../../assets/logo-wide.png";
import "../authLayout.css";
import "./Dashboard.css";

export default function Dashboard() {
  // const [user, setUser] = useState(null);
  // const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const fetchUser = async () => {
  //     try {
  //       const userData = await getUserProfile();
  //       setUser(userData);
  //     } catch (error) {
  //       console.error("Error fetching user profile:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUser();
  // }, []);

  // if (loading) {
  //   return (
  //     <div
  //       style={{
  //         display: "flex",
  //         justifyContent: "center",
  //         alignItems: "center",
  //         height: "100vh",
  //       }}
  //     >
  //       Loading...
  //     </div>
  //   );
  // }

  return (
    <div className="auth-shell dash">
      <header className="dash-header">
        <div className="dash-header-inner">
          <Link to="/" className="dash-brand" aria-label="Virtual Office home">
            <img src={logoWide} alt="Virtual Office" />
          </Link>
          <Link to="/chat" className="auth-btn auth-btn-primary">
            Enter office
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="dash-main">
        <section className="dash-hero">
          <span className="dash-hero-eyebrow">
            <Sparkles size={15} aria-hidden="true" />
            Your workspace is ready
          </span>
          <h1 className="dash-hero-title">Welcome to your Dashboard</h1>
          <p className="dash-hero-text">
            {/* {user ? `${user.firstName} ${user.lastName}` : "User"} */}
            Jump into your virtual office to chat, collaborate and meet your team by proximity — or
            finish setting things up below.
          </p>
          <div className="dash-hero-actions">
            <Link to="/chat" className="auth-btn auth-btn-primary">
              Go to my office
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/onboarding" className="auth-btn auth-btn-ghost">
              Set up a workspace
            </Link>
          </div>
        </section>

        <h2 className="dash-section-title">Quick actions</h2>
        <div className="dash-grid">
          <Link to="/chat" className="dash-card">
            <span className="dash-card-icon">
              <MessageSquare size={22} aria-hidden="true" />
            </span>
            <h3 className="dash-card-title">
              Open chat <ArrowRight size={16} aria-hidden="true" />
            </h3>
            <p className="dash-card-text">
              Catch up on channels, threads and direct messages with your team.
            </p>
          </Link>

          <Link to="/onboarding" className="dash-card">
            <span className="dash-card-icon">
              <LayoutGrid size={22} aria-hidden="true" />
            </span>
            <h3 className="dash-card-title">
              Set up workspace <ArrowRight size={16} aria-hidden="true" />
            </h3>
            <p className="dash-card-text">
              Create a new workspace or join one you were invited to.
            </p>
          </Link>

          <Link to="/onboarding" className="dash-card">
            <span className="dash-card-icon">
              <UserPlus size={22} aria-hidden="true" />
            </span>
            <h3 className="dash-card-title">
              Invite your team <ArrowRight size={16} aria-hidden="true" />
            </h3>
            <p className="dash-card-text">
              Bring your teammates in with a single invitation link.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
