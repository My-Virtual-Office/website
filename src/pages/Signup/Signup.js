import { Link } from "react-router-dom";
import Header from "../../components/Header";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import "./Signup.css";

export default function Signup() {
  return (
    <div className="signup-page">
      <Header />

      <main className="signup-main">
        <div className="signup-left">
          <div className="signup-box">
            <h1 className="signup-title">Sign up</h1>
            <p className="signup-sub">
              Create an account or <Link to="/login">Login</Link>
            </p>

            <form className="signup-form">
              <InputField
                label="Email Address"
                type="email"
                placeholder="Enter your email"
              />

              <InputField
                label="Username"
                type="text"
                placeholder="Create a username"
              />

              <InputField
                label="Password"
                type="password"
                placeholder="Create a password"
              />

              <div className="terms-group">
                <label className="terms-label">
                  <input type="checkbox" />
                  <span>
                    You accept the{" "}
                    <Link to="/privacy-policy" className="terms-link">
                      privacy policy
                    </Link>{" "}
                    and{" "}
                    <Link to="/terms-of-use" className="terms-link">
                      terms of use
                    </Link>
                  </span>
                </label>
              </div>

              <Button>Sign Up</Button>
            </form>
          </div>
        </div>

        <div className="signup-right">
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
