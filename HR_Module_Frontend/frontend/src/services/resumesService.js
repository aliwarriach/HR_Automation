import apiClient from "./apiClient";

export const getResumes = () => apiClient.get("/resumes/");

export const getResume = (id) => apiClient.get(`/resumes/${id}`);

export const getResumeDetail = (id) => apiClient.get(`/resumes/${id}/detail`);

export const refreshResumes = () => apiClient.post("/resumes/refresh");

export const downloadResume = (id) =>
  apiClient.get(`/resumes/${id}/download`, {}, { responseType: "blob" });
