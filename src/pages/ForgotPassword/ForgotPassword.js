import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Check,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Mail,
  KeyRound,
} from "lucide-react";
import { requestPasswordReset, resetPassword } from "../../api/auth";

import logoWide from "../../assets/logo-wide.png";
import "../authLayout.css";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // "email" -> "reset"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1 — email a 6-digit reset code.
  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await requestPasswordReset(email.trim());
      if (res?.status === "OTP generated") {
        setStep("reset");
        setNotice(`We sent a 6-digit code to ${email.trim()}. It expires in 10 minutes.`);
      } else if (res?.status === "User not found") {
        setError("No account is registered with that email.");
      } else {
        setError(res?.status || "Could not send the code. Please try again.");
      }
    } catch {
      setError("Connection failed. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify the code and set a new password.
  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword: password,
      });
      if (res?.status === "Password reset") {
        navigate("/login", {
          state: { message: "Your password was reset. Please sign in with your new password." },
        });
      } else {
        // Backend messages: "Invalid OTP", "OTP expired", "No Pending OTP found", etc.
        setError(res?.status || "Could not reset your password. Please try again.");
      }
    } catch {
      setError("Connection failed. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError("");
    setNotice("");
    try {
      const res = await requestPasswordReset(email.trim());
      setNotice(
        res?.status === "OTP generated"
          ? "A new code is on its way to your inbox."
          : res?.status || "Could not resend the code.",
      );
    } catch {
      setError("Connection failed. Please try again later.");
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
              Account recovery
            </span>
            <h2 className="auth-brand-title">Locked out? Let's get you back in.</h2>
            <p className="auth-brand-text">
              Reset your password in a couple of clicks with a secure one-time code sent to your
              email.
            </p>
            <ul className="auth-brand-list">
              <li>
                <Check size={18} aria-hidden="true" /> A 6-digit code, valid for 10 minutes
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Set a brand-new password
              </li>
              <li>
                <Check size={18} aria-hidden="true" /> Back to your desk in seconds
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
              <h1 className="auth-title">
                {step === "email" ? "Reset your password" : "Enter your code"}
              </h1>
              <p className="auth-subtitle">
                {step === "email"
                  ? "Enter the email for your account and we'll send you a reset code."
                  : "Enter the code we emailed you, then choose a new password."}
              </p>
            </div>

            {error && (
              <div className="auth-alert auth-alert-error" role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
            {notice && !error && (
              <div className="auth-alert auth-alert-success" role="status">
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>{notice}</span>
              </div>
            )}

            {step === "email" ? (
              <form onSubmit={handleRequest} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="fp-email">
                    Email Address
                  </label>
                  <input
                    id="fp-email"
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

                <button
                  type="submit"
                  className="auth-btn auth-btn-primary auth-btn-block"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="auth-spinner" aria-hidden="true" />
                  ) : (
                    <>
                      <Mail size={18} aria-hidden="true" /> Send reset code
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleReset} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="fp-otp">
                    Reset code
                  </label>
                  <input
                    id="fp-otp"
                    className="auth-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    autoComplete="one-time-code"
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="fp-password">
                    New password
                  </label>
                  <input
                    id="fp-password"
                    className="auth-input"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="fp-confirm">
                    Confirm new password
                  </label>
                  <input
                    id="fp-confirm"
                    className="auth-input"
                    type="password"
                    placeholder="Re-enter your new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  className="auth-btn auth-btn-primary auth-btn-block"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="auth-spinner" aria-hidden="true" />
                  ) : (
                    <>
                      <KeyRound size={18} aria-hidden="true" /> Reset password
                    </>
                  )}
                </button>

                <p className="auth-alt">
                  Didn't get it?{" "}
                  <button type="button" className="auth-inline-link auth-linkbtn" onClick={resend}>
                    Resend code
                  </button>
                </p>
              </form>
            )}

            <p className="auth-alt">
              <Link to="/login" className="auth-back">
                <ArrowLeft size={16} aria-hidden="true" /> Back to sign in
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
