import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, AlertCircle, Sparkles, MailCheck } from "lucide-react";
import { verifyEmail } from "../../api/auth";
import logoWide from "../../assets/logo-wide.png";
import "../authLayout.css";
import "./VerifyEmail.css";

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await verifyEmail({ email, otp });
      navigate("/login", { state: { message: "Email verified successfully! Please login." } });
    } catch (err) {
      setError("Invalid code. Please check your email and try again.");
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
              One last step
            </span>
            <h2 className="auth-brand-title">Let's make sure it's really you.</h2>
            <p className="auth-brand-text">
              We've emailed you a one-time code. Enter it to confirm your address and unlock your
              new workspace.
            </p>
            <ul className="auth-brand-list">
              <li>
                <Check size={18} aria-hidden="true" /> Keeps your account secure
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Takes less than a minute
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Then you're ready to move in
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

            <div className="auth-head auth-head-center">
              <span className="auth-badge" aria-hidden="true">
                <MailCheck size={28} />
              </span>
              <h1 className="auth-title">Verify your email</h1>
              <p className="auth-subtitle">
                {email ? (
                  <>
                    We've sent a verification code to <strong>{email}</strong>
                  </>
                ) : (
                  "Enter the verification code we sent to your email."
                )}
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
                <label className="auth-label" htmlFor="verify-otp">
                  Verification Code
                </label>
                <input
                  id="verify-otp"
                  className="auth-input"
                  type="text"
                  placeholder="Enter the OTP code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>

              <button
                type="submit"
                className="auth-btn auth-btn-primary auth-btn-block"
                disabled={loading}
              >
                {loading ? <span className="auth-spinner" aria-hidden="true" /> : "Verify Account"}
              </button>
            </form>

            <p className="auth-alt">
              Didn't receive the code? <span className="auth-link resend-link">Resend OTP</span>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
