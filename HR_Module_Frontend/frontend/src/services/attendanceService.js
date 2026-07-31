import apiClient from "./apiClient";

export const getTodayAttendance = () => apiClient.get("/attendance/today");

export const checkIn = (payload) => apiClient.post("/attendance/check-in", payload);

export const checkOut = () => apiClient.post("/attendance/check-out");

export const startBreak = (payload) => apiClient.post("/attendance/break/start", payload);

export const endBreak = () => apiClient.post("/attendance/break/end");

export const markLeave = () => apiClient.post("/attendance/leave");

export const getAttendanceHistory = () => apiClient.get("/attendance/history");
