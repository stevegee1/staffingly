/**
 * Main API Module - Drop-in replacement for base44 SDK
 *
 * Usage:
 *   import { api } from '@/api';
 *
 *   // Auth (same as base44.auth)
 *   await api.auth.me();
 *   api.auth.logout();
 *
 *   // Entities (same as base44.entities)
 *   await api.entities.Staff.list();
 *   await api.entities.Client.filter({ active: true });
 *   await api.entities.Invoice.create({ ... });
 *
 *   // Functions (same as base44.functions.invoke)
 *   await api.functions.invoke('availityEligibility', { ... });
 *
 *   // Integrations (same as base44.integrations.Core)
 *   await api.integrations.Core.UploadFile({ file });
 *   await api.integrations.Core.InvokeLLM({ prompt, context });
 */

import apiClient from "./clients/apiClient";
import authService from "./services/authService";
import entities from "./services/entityService";
import functionsService from "./services/functionsService";
import integrations from "./services/integrationsService";

export const api = {
  auth: authService,
  entities,
  functions: functionsService,
  integrations,
  client: apiClient,
};

// Re-export for convenience
export { apiClient } from "./clients/apiClient";
export { authService } from "./services/authService";
export { entities } from "./services/entityService";
export { functionsService } from "./services/functionsService";
export { integrations } from "./services/integrationsService";
export * from "./services/functionsService";

export default api;
