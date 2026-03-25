const isNode = typeof window === "undefined";
const windowObj = isNode
  ? {
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    }
  : window;
const storage = windowObj.localStorage;

/**
 * Converts a camelCase or PascalCase string to snake_case.
 * @param {string} str - The string to convert.
 * @returns {string} The snake_case version of the string.
 */
const toSnakeCase = (str) => {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
};

/**
 * Retrieves an application parameter value from URL search params,
 * localStorage, or a default value. If found in the URL, it persists the value
 * to localStorage for future use.
 *
 * @param {string} paramName - The name of the parameter to retrieve
 * (e.g., "app_id").
 * @param {Object} [options] - Configuration options.
 * @param {*} [options.defaultValue] - The value to return if not found
 * elsewhere.
 * @param {boolean} [options.removeFromUrl=false] - Whether to remove the
 * parameter from the URL after retrieval.
 * @returns {*} The parameter value or null if not found.
 */
const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
  if (isNode) {
    return defaultValue;
  }
  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);

  if (removeFromUrl) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${
      urlParams.toString() ? `?${urlParams.toString()}` : ""
    }${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }

  if (searchParam) {
    storage.setItem(storageKey, searchParam);
    return searchParam;
  }

  if (defaultValue) {
    storage.setItem(storageKey, defaultValue);
    return defaultValue;
  }

  const storedValue = storage.getItem(storageKey);
  if (storedValue) {
    return storedValue;
  }

  return null;
};

/**
 * Aggregates all essential application parameters into a single object.
 * Handles token clearing logic if the "clear_access_token" param is present.
 *
 * @returns {Object} An object containing appId, token, fromUrl,
 * functionsVersion, and appBaseUrl.
 */
const getAppParams = () => {
  if (getAppParamValue("clear_access_token") === "true") {
    storage.removeItem("base44_access_token");
    storage.removeItem("token");
  }

  return {
    appId: getAppParamValue("app_id", {
      defaultValue: import.meta.env.VITE_BASE44_APP_ID,
    }),
    token: getAppParamValue("access_token", { removeFromUrl: true }),
    fromUrl: getAppParamValue("from_url", {
      defaultValue: window.location.href,
    }),
    functionsVersion: getAppParamValue("functions_version", {
      defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
    }),
    appBaseUrl: getAppParamValue("app_base_url", {
      defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL,
    }),
  };
};

export const appParams = { ...getAppParams() };
