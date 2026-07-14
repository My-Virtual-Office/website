import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, AlertCircle, Sparkles } from "lucide-react";

import { registerUser } from "../../api/auth";
import logoWide from "../../assets/logo-wide.png";
import "../authLayout.css";
import "./Signup.css";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await registerUser({
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        phoneNumber: phoneNumber,
      });

      if (!response.token) {
        setError(response.errorMessage || "Registration failed. Please try again.");
        return;
      }
      localStorage.setItem("token", response.token);
      navigate("/dashboard");
    } catch (err) {
      if (err.response && err.response.data && err.response.data.errorMessage) {
        const backendMessage = err.response.data.errorMessage;

        if (backendMessage === "Such E-mail Already Exist") {
          setError("This email is already registered. Try logging in.");
        } else {
          setError(backendMessage);
        }
      } else {
        setError("Something went wrong. Try again.");
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
              Get started free
            </span>
            <h2 className="auth-brand-title">Move your team into one virtual office.</h2>
            <p className="auth-brand-text">
              Create your account in seconds and bring chat, tasks, meetings and a walkable 2D
              office together — no more juggling apps.
            </p>
            <ul className="auth-brand-list">
              <li>
                <Check size={18} aria-hidden="true" /> Free for small teams, no credit card
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Unlimited channels and shared boards
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Proximity voice in your own 2D office
              </li>
            </ul>
          </div>

          <p className="auth-brand-foot">© {new Date().getFullYear()} Virtual Office</p>
        </aside>

        {/* ---------- Form panel ---------- */}
        <main className="auth-panel">
          <div className="auth-card auth-card-wide">
            <Link to="/" className="auth-card-logo" aria-label="Virtual Office home">
              <img src={logoWide} alt="Virtual Office" />
            </Link>

            <div className="auth-head">
              <h1 className="auth-title">Create your account</h1>
              <p className="auth-subtitle">
                Already have one? <Link to="/login">Log in</Link>
              </p>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-email">
                  Email Address
                </label>
                <input
                  id="signup-email"
                  className="auth-input"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={100}
                  autoComplete="email"
                />
              </div>

              <div className="auth-grid-2">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-first">
                    First Name
                  </label>
                  <input
                    id="signup-first"
                    className="auth-input"
                    type="text"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    maxLength={100}
                    autoComplete="given-name"
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="signup-last">
                    Last Name
                  </label>
                  <input
                    id="signup-last"
                    className="auth-input"
                    type="text"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    maxLength={100}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-password">
                  Password
                </label>
                <input
                  id="signup-password"
                  className="auth-input"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="signup-phone">
                  Phone Number
                </label>
                <input
                  id="signup-phone"
                  className="auth-input"
                  type="text"
                  placeholder="Enter your phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={20}
                  autoComplete="tel"
                />
              </div>

              <label className="auth-check auth-check-start">
                <input type="checkbox" required />
                <span>
                  You accept the{" "}
                  <Link to="/privacy-policy" className="auth-link">
                    privacy policy
                  </Link>{" "}
                  and{" "}
                  <Link to="/terms-of-use" className="auth-link">
                    terms of use
                  </Link>
                </span>
              </label>

              <button
                type="submit"
                className="auth-btn auth-btn-primary auth-btn-block"
                disabled={loading}
              >
                {loading ? <span className="auth-spinner" aria-hidden="true" /> : "Sign Up"}
              </button>
            </form>

            <p className="auth-alt">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
