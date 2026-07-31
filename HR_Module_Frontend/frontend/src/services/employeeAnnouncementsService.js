import apiClient from "./apiClient";

export const getMyAnnouncements = () => apiClient.get("/employee/announcements");

export const getMyAnnouncement = (id) => apiClient.get(`/employee/announcements/${id}`);
