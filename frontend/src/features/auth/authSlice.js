import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import apiClient, { clearClientCsrfToken } from "../../services/apiClient.js";
import { toCanonicalRole } from "../../constants/roles.js";

const STORAGE_KEYS = {
  user: "auth_user",
  accessToken: "auth_access_token"
};

const getStoredJson = (key) => {
  const value = localStorage.getItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getApiErrorMessage = (error, fallbackMessage) =>
  error.response?.data?.message || fallbackMessage;

function hydrateStoredUser() {
  const raw = getStoredJson(STORAGE_KEYS.user);
  if (!raw) return null;
  const role = toCanonicalRole(raw.role);
  if (role === raw.role) return raw;
  const next = { ...raw, role };
  try {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post("/auth/login", payload);
      clearClientCsrfToken();
      return data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, "Login failed"));
    }
  }
);

export const signupThunk = createAsyncThunk(
  "auth/signup",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post("/auth/signup", payload);
      return data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, "Signup failed"));
    }
  }
);

export const resendVerificationThunk = createAsyncThunk(
  "auth/resendVerification",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post("/auth/resend-verification", payload);
      return data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to resend verification email"));
    }
  }
);

export const forgotPasswordThunk = createAsyncThunk(
  "auth/forgotPassword",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post("/auth/forgot-password", payload);
      return data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to send password reset email"));
    }
  }
);

export const resetPasswordThunk = createAsyncThunk(
  "auth/resetPassword",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post("/auth/reset-password", payload);
      return data;
    } catch (error) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to reset password"));
    }
  }
);

export const logoutThunk = createAsyncThunk(
  "auth/logoutRemote",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiClient.post("/auth/logout");
      clearClientCsrfToken();
      return data;
    } catch (error) {
      clearClientCsrfToken();
      return rejectWithValue(getApiErrorMessage(error, "Logout failed"));
    }
  }
);

const initialState = {
  user: hydrateStoredUser(),
  accessToken: localStorage.getItem(STORAGE_KEYS.accessToken),
  loading: false,
  error: null,
  signupSuccess: null
};

const clearStoredSession = (state) => {
  state.user = null;
  state.accessToken = null;
  state.error = null;
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.accessToken);
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthFeedback: (state) => {
      state.error = null;
      state.signupSuccess = null;
    },
    setAccessToken: (state, action) => {
      state.accessToken = action.payload;
      if (action.payload) {
        localStorage.setItem(STORAGE_KEYS.accessToken, action.payload);
      } else {
        localStorage.removeItem(STORAGE_KEYS.accessToken);
      }
    },
    logout: (state) => {
      clearStoredSession(state);
      state.signupSuccess = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.signupSuccess = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.signupSuccess = null;
        const user = {
          ...action.payload.user,
          role: toCanonicalRole(action.payload.user?.role)
        };
        state.user = user;
        state.accessToken = action.payload.accessToken;
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEYS.accessToken, action.payload.accessToken);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Invalid credentials";
      })
      .addCase(signupThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.signupSuccess = null;
      })
      .addCase(signupThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.signupSuccess = action.payload.message || "Signup completed successfully";
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Signup failed";
      })
      .addCase(resendVerificationThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendVerificationThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.signupSuccess =
          action.payload?.message || "If the account is unverified, verification email was sent.";
      })
      .addCase(resendVerificationThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to resend verification email";
      })
      .addCase(forgotPasswordThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.signupSuccess = null;
      })
      .addCase(forgotPasswordThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.signupSuccess = action.payload?.message || "If account exists, reset mail will be sent.";
      })
      .addCase(forgotPasswordThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to send password reset email";
      })
      .addCase(resetPasswordThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.signupSuccess = null;
      })
      .addCase(resetPasswordThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.signupSuccess = action.payload?.message || "Password reset successful";
      })
      .addCase(resetPasswordThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to reset password";
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        clearStoredSession(state);
        state.signupSuccess = null;
      })
      .addCase(logoutThunk.rejected, (state) => {
        clearStoredSession(state);
        state.signupSuccess = null;
      });
  }
});

export const { setAccessToken, logout, clearAuthFeedback } = authSlice.actions;
export default authSlice.reducer;
