import apiClient from "./apiClient";

export const getJobPostings = () => apiClient.get("/job-postings/");

export const createJobPosting = (title, requirements) =>
  apiClient.post("/job-postings/", { title, requirements });
