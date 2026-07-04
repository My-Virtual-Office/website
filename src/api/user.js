import axiosInstance from "./axiosInstance";

export const getCurrentUser = async () => {
  const response = await axiosInstance.get("/api/users/me");
  return response.data;
};

export const getAllUsers = async () => {
  const response = await axiosInstance.get("/api/users");
  return response.data;
};

export const updatePassword = async (passwords) => {
  // passwords = { oldPassword: "...", newPassword: "..." }
  const response = await axiosInstance.put("/api/users/me/password", passwords);
  return response.data;
};

export const uploadPhoto = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosInstance.post("/api/users/me/photo", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getUserPhoto = async () => {
  const response = await axiosInstance.get("/api/users/me/photo", {
    responseType: "blob",
  });
  return URL.createObjectURL(response.data);
};
