import axios from "axios";

const ACCESS_TOKEN_STORAGE_KEY = "auth_access_token";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const CSRF_COOKIE_NAME = "csrfToken";
const CSRF_HEADER_NAME = "X-CSRF-Token";
let csrfTokenRequest = null;
/** Value last aligned with GET /auth/csrf-token (prefer JSON body over reading document.cookie alone). */
let clientCsrfToken = null;

export const clearClientCsrfToken = () => {
  clientCsrfToken = null;
  csrfTokenRequest = null;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

const getCookieValue = (name) =>
  document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const isUnsafeMethod = (method) =>
  ["post", "put", "patch", "delete"].includes(String(method || "get").toLowerCase());

const ensureCsrfToken = async () => {
  if (clientCsrfToken) return clientCsrfToken;

  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not set; cannot request CSRF token");
  }

  if (!csrfTokenRequest) {
    csrfTokenRequest = axios
      .get(`${API_BASE_URL}/auth/csrf-token`, { withCredentials: true })
      .finally(() => {
        csrfTokenRequest = null;
      });
  }

  const { data } = await csrfTokenRequest;
  const fromBody = typeof data?.csrfToken === "string" ? data.csrfToken : "";
  const fromCookie = decodeURIComponent(getCookieValue(CSRF_COOKIE_NAME) || "");
  clientCsrfToken = fromBody || fromCookie;
  return clientCsrfToken;
};

apiClient.interceptors.request.use(async (config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (isUnsafeMethod(config.method)) {
    if (!token) {
      config.headers[CSRF_HEADER_NAME] = await ensureCsrfToken();
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url || "");
    const isAuthEndpoint = requestUrl.startsWith("/auth/");

    if (
      error.response?.status === 403 &&
      /csrf/i.test(String(error.response?.data?.message || "")) &&
      originalRequest &&
      !originalRequest._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      clearClientCsrfToken();
      originalRequest.headers[CSRF_HEADER_NAME] = await ensureCsrfToken();
      return apiClient(originalRequest);
    }

    if (error.response?.status === 401 && originalRequest && !isAuthEndpoint && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const csrfToken = await ensureCsrfToken();
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: { [CSRF_HEADER_NAME]: csrfToken }
          }
        );
        localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, res.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        clearClientCsrfToken();
        localStorage.removeItem("auth_user");
        localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
