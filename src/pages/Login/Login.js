import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Check, AlertCircle, Sparkles } from "lucide-react";
import { loginUser } from "../../api/auth";

import logoWide from "../../assets/logo-wide.png";
import "../authLayout.css";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await loginUser({
        email: email,
        password: password,
      });

      if (!response.token) {
        setError("Invalid email or password.");
        return;
      }
      localStorage.setItem("token", response.token);
      navigate("/chat");
    } catch (err) {
      if (err.response) {
        const backendData = err.response.data;

        if (backendData && backendData.errorMessage === "User Not Found") {
          setError("This email is not registered.");
        } else {
          setError("Invalid email or password.");
        }
      } else {
        setError("Connection failed. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-split">
        {/* ---------- Brand panel ---------- */}
        <aside className="auth-brand">
          <Link to="/" className="auth-brand-mark" aria-label="Virtual Office home">
            <img src={logoWide} alt="Virtual Office" />
          </Link>

          <div className="auth-brand-body">
            <span className="auth-brand-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              Welcome back
            </span>
            <h2 className="auth-brand-title">Your team is already at their desks.</h2>
            <p className="auth-brand-text">
              Sign in to jump back into chat, tasks, meetings and your walkable 2D office — all in
              one place.
            </p>
            <ul className="auth-brand-list">
              <li>
                <Check size={18} aria-hidden="true" /> Pick up conversations right where you left
                them
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> See who's around and talk by proximity
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Everything synced across your devices
              </li>
            </ul>
          </div>

          <p className="auth-brand-foot">© {new Date().getFullYear()} Virtual Office</p>
        </aside>

        {/* ---------- Form panel ---------- */}
        <main className="auth-panel">
          <div className="auth-card">
            <Link to="/" className="auth-card-logo" aria-label="Virtual Office home">
              <img src={logoWide} alt="Virtual Office" />
            </Link>

            <div className="auth-head">
              <h1 className="auth-title">Let's work together!</h1>
              <p className="auth-subtitle">Welcome back — please sign in to your account.</p>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-email">
                  Email Address
                </label>
                <input
                  id="login-email"
                  className="auth-input"
                  type="email"
                  placeholder="email@digital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={100}
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  className="auth-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="auth-row">
                <label className="auth-check">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <Link to="/forgot-password" className="auth-inline-link">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                className="auth-btn auth-btn-primary auth-btn-block"
                disabled={loading}
              >
                {loading ? <span className="auth-spinner" aria-hidden="true" /> : "Login"}
              </button>
            </form>

            <p className="auth-alt">
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
