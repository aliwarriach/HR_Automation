import apiClient from "./apiClient";

export const getShortlist = () => apiClient.get("/shortlist/");

export const getShortlistEntry = (id) => apiClient.get(`/shortlist/${id}`);

export const createShortlistEntry = (resumeId) =>
  apiClient.post("/shortlist/", { resume_id: resumeId });

export const updateShortlistStatus = (id, status) =>
  apiClient.patch(`/shortlist/${id}`, { status });

export const deleteShortlistEntry = (id) => apiClient.delete(`/shortlist/${id}`);
