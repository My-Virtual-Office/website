import { Link } from "react-router-dom";
import Header from "../../components/Header";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import "./Login.css";

export default function Login() {
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

            <InputField
              label="Email Address"
              type="email"
              placeholder="email@digital.com"
            />

            <InputField
              label="Password"
              type="password"
              placeholder="••••••••"
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

            <Button onClick={() => console.log("Login clicked")} type="submit">
              Login
            </Button>

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