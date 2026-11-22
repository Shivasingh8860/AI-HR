import axios from "axios";

// On Vercel, requests to '/api' route to the serverless Express backend on the same origin.
// In local dev, Vite proxies '/api' to 'http://localhost:5000' or uses VITE_API_URL if defined.
const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("smart_hr_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

