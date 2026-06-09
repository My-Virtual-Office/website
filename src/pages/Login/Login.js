import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import { useState } from "react";
import { loginUser } from "../../api/auth";

import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(loading) return
    setLoading(true);
    setError("");

    try {
      const response = await loginUser({
        email: email,
        password: password,
      });

      if (!response.token || !response) {
        setError("Invalid email or password.");
        setLoading(false);
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
    <div className="login-page">
      <Header />

      <main className="login-main">
        <div className="login-left">
          <div className="login-box">
            <h1 className="welcome-title">Lets work together!</h1>
            <p className="welcome-sub">
              Welcome back! Please login to your account.
            </p>

            {error && <p style={{ color: "red" }}>{error}</p>}

            <form onSubmit={handleSubmit}>
              <InputField
                label="Email Address"
                type="email"
                placeholder="email@digital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={100}
              />

              <InputField
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <div className="remember-row">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  <span>Remember Me</span>
                </label>
                <Link to="/forgot-password" className="forgot-link">
                  Forgot Password?
                </Link>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Loading..." : "Login"}
              </Button>
            </form>

            <p className="signup-text">
              Don't have an account? <Link to="/signup">Sign Up</Link>
            </p>
          </div>
        </div>

        <div className="login-right">
          <img
            src="/offficeImage.JPG"
            alt="Office illustration"
            className="office-img"
          />
        </div>
      </main>
    </div>
  );
}
