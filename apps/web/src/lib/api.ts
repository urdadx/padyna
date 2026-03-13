import axios from "axios";
import { env } from "@padyna/env/web";

const api = axios.create({
  baseURL: env.VITE_SERVER_URL,
  withCredentials: true,
});

export default api;
