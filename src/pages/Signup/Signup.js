import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Header from "../../components/Header";
import InputField from "../../components/InputField";
import Button from "../../components/Button";
import "./Signup.css";
import { registerUser } from "../../api/auth";
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
    <div className="signup-page">
      <Header />

      <main className="signup-main">
        <div className="signup-left">
          <div className="signup-box">
            <h1 className="signup-title">Sign up</h1>
            <p className="signup-sub">
              Create an account or <Link to="/login">Login</Link>
            </p>
            {error && <p style={{ color: "red" }}>{error}</p>}
            <form onSubmit={handleSubmit} className="signup-form">
              <InputField
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={100}
              />

              <InputField
                label="First Name"
                type="text"
                placeholder="Enter your first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                maxLength={100}
              />

              <InputField
                label="Last Name"
                type="text"
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                maxLength={100}
              />

              <InputField
                label="Password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <InputField
                label="Phone Number"
                type="text"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                maxLength={20}
              />

              <div className="terms-group">
                <label className="terms-label">
                  <input type="checkbox" required />
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

              <Button type="submit" disabled={loading}>
                {loading ? "Loading..." : "Sign Up"}
              </Button>
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
