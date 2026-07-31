import apiClient from "./apiClient";

export const getAttendanceDashboard = (date) => apiClient.get("/attendance/dashboard", date ? { date } : {});

export const getWorkingHours = () => apiClient.get("/working-hours/");

export const updateWorkingHours = (payload) => apiClient.post("/working-hours/", payload);

export const getAdminAttendanceList = (params) => apiClient.get("/attendance/list", params);

export const getEmployeeAttendanceDetail = (employeeId, params) =>
  apiClient.get(`/attendance/${employeeId}`, params);
