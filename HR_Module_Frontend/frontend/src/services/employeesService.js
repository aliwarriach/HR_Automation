import apiClient from "./apiClient";

export const getEmployees = () => apiClient.get("/employees/");

export const getEmployee = (id) => apiClient.get(`/employees/${id}`);

export const createEmployee = (payload) => apiClient.post("/employees/", payload);

export const updateEmployee = (id, payload) => apiClient.put(`/employees/${id}`, payload);

export const deleteEmployee = (id) => apiClient.delete(`/employees/${id}`);
