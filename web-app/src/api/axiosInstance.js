import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.BACKEND_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
  
// DEV-only request logger
if (import.meta.env.DEV) {
  axiosInstance.interceptors.request.use((config) => {
    console.log(
      `[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`,
      config.data || ""
    );
    return config;
  });
}

// DEV-only response logger
if (import.meta.env.DEV) {
  axiosInstance.interceptors.response.use(
    (response) => {
      console.log(
        `[API RESPONSE] ${response.status} ${response.config.url}`,
        response.data
      );
      return response;
    },
    (error) => {
      console.error(
        `[API ERROR] ${error.response?.status} ${error.config?.url}`,
        error.response?.data
      );
      return Promise.reject(error);
    }
  );
}

// Global response handler (optional but recommended)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;