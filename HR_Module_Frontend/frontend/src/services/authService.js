import apiClient from "./apiClient";

export const login = (email, password) =>
  apiClient.post("/auth/login", { email, password });

export const getMe = () => apiClient.get("/auth/me");
