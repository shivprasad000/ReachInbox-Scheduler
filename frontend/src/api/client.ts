import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send the httpOnly auth cookie
});

export function googleLoginUrl() {
  return `${API_URL}/auth/google`;
}
