import apiClient from "./apiClient";

export const createAnnouncement = (payload) => apiClient.post("/announcements", payload);

export const getAnnouncements = (params) => apiClient.get("/announcements", params);

export const getAnnouncement = (id) => apiClient.get(`/announcements/${id}`);

export const updateAnnouncement = (id, payload) => apiClient.put(`/announcements/${id}`, payload);

export const deleteAnnouncement = (id) => apiClient.delete(`/announcements/${id}`);
