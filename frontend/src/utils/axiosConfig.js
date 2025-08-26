// utils/axiosConfig.js
import axios from "axios";

// Prefer env, else default to relative /api (works on production domain)
const BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||   // your .env.production
  process.env.REACT_APP_API_URL ||        // legacy support
  "/api";                                 // fallback

axios.defaults.baseURL = "/api";
axios.defaults.withCredentials = true;

export default axios;
