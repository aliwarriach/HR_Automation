import { create } from "apisauce";
import { useAuthStore } from "../store/authStore";

const apiClient = create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.addRequestTransform((request) => {
  const { token } = useAuthStore.getState();
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
});

apiClient.addMonitor((response) => {
  if (response.status === 401 && !response.config?.url?.includes("/auth/login")) {
    useAuthStore.getState().logout();
    window.location.replace("/login");
  }
});

export default apiClient;
