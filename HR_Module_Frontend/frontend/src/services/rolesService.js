import apiClient from "./apiClient";

export const createRole = (payload) => apiClient.post("/roles/", payload);

export const getRoles = () => apiClient.get("/roles/");

export const getRole = (id) => apiClient.get(`/roles/${id}`);

export const updateRole = (id, payload) => apiClient.put(`/roles/${id}`, payload);

export const deleteRole = (id) => apiClient.delete(`/roles/${id}`);

export const getPermissionOptions = () => apiClient.get("/roles/permission-options");
