import axiosInstance from "./axiosInstance";

export const registerUser = async (data) => {
  const response = await axiosInstance.post("/api/auth/register", data);
  console.log(response);
  return response.data;
};

export const loginUser = async (data) => {
  const response = await axiosInstance.post("/api/auth/login", data);
  console.log(response);
  return response.data;
};

// export const validateToken = async () => {
//   const response = await axiosInstance.get("/api/auth/validate");
//   console.log(response);
//   return response.data;
// };

// export const verifyEmail = async (data) => {
//   const response = await axiosInstance.post("/api/auth/verify-email", data);
//   return response.data;
// };
