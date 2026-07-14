import axiosInstance from "./axiosInstance";

export const registerUser = async (data) => {
  const response = await axiosInstance.post("/api/auth/register", data);
  return response.data;
};

export const loginUser = async (data) => {
  const response = await axiosInstance.post("/api/auth/login", data);
  return response.data;
};

// export const validateToken = async () => {
//   const response = await axiosInstance.get("/api/auth/validate");
//   console.log(response);
//   return response.data;
// };

export const verifyEmail = async (data) => {
  const response = await axiosInstance.post("/api/auth/verify-email", data);
  return response.data;
};

// Forgot-password flow. Both endpoints always return HTTP 200 with a { status } message
// (e.g. "OTP generated", "User not found", "Password reset", "Invalid OTP").
export const requestPasswordReset = async (email) => {
  const response = await axiosInstance.post("/api/auth/otp/request", { email });
  return response.data;
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  const response = await axiosInstance.post("/api/auth/otp/reset", { email, otp, newPassword });
  return response.data;
};
