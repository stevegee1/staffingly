/**
 * Auth Service - Handles authentication
 * Replaces base44.auth
 */

import apiClient from "../clients/apiClient";

export const authService = {
  async login(email, password) {
    const response = await apiClient.post("/api/auth/login", {
      email,
      password,
    });
    // Backend returns { success, data: { token, user } }
    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    return response.data || response;
  },

  async register(userData) {
    const response = await apiClient.post("/api/auth/register", userData);
    if (response.data?.token) {
      apiClient.setToken(response.data.token);
    }
    return response.data || response;
  },

  async me() {
    const response = await apiClient.get("/api/auth/me");
    // Backend returns { success, data: { id, email, name, role, ... } }
    return response.data || response;
  },

  async updateProfile(data) {
    return apiClient.put("/api/auth/profile", data);
  },

  async changePassword(currentPassword, newPassword) {
    return apiClient.post("/api/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },

  async forgotPassword(email) {
    return apiClient.post("/api/auth/forgot-password", { email });
  },

  async resetPassword(token, newPassword) {
    return apiClient.post("/api/auth/reset-password", { token, newPassword });
  },

  logout(redirectUrl = null) {
    apiClient.setToken(null);
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.href = "/login";
    }
  },

  redirectToLogin(returnUrl = null) {
    const url = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : "/login";
    window.location.href = url;
  },

  isAuthenticated() {
    return !!apiClient.getToken();
  },
};

export default authService;
