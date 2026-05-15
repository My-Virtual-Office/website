import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyEmail } from "../../api/auth";
import Button from "../../components/Button";
import InputField from "../../components/InputField";
import Header from "../../components/Header";
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
    <div className="verify-page">
      <Header />
      <main className="verify-main">
        <div className="verify-box">
          <h1 className="verify-title">Verify your email</h1>
          <p className="verify-sub">
            We've sent a verification code to <strong>{email}</strong>
          </p>

          {error && <p className="error-message">{error}</p>}

          <form onSubmit={handleSubmit} className="verify-form">
            <InputField
              label="Verification Code"
              type="text"
              placeholder="Enter the OTP code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />

            <Button type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify Account"}
            </Button>
          </form>

          <p className="resend-text">
            Didn't receive the code? <span className="resend-link">Resend OTP</span>
          </p>
        </div>
      </main>
    </div>
  );
}
