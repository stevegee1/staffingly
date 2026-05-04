/**
 * Utility helpers for managing the authentication token.
 *
 * Responsibilities:
 * - read and write the auth token to/from localStorage
 * - provide simple token lifecycle primitives used by the auth service
 */

/**
 * Retrieve the current authentication token from localStorage.
 *
 * @returns {string|null}
 */
export const getToken = () => {
  return localStorage.getItem("auth_token");
};

export const getDeviceId = () => {
  const existing = localStorage.getItem("auth_device_id");
  if (existing) return existing;

  const generated =
    globalThis.crypto?.randomUUID?.() ||
    `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  localStorage.setItem("auth_device_id", generated);
  return generated;
};

/**
 * Updates the authentication token in localStorage.
 *
 * @param {string|null} token
 */
export const setToken = (token) => {
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
};
