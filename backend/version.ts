// Single source of truth for the backend release. backend/index.ts re-exports
// it and sends it as X-Hikmah-Backend-Version; the admin Health tab compares the
// live header with this value. Change it with every backend release.
export const BACKEND_VERSION='2026-11-24-monitoring';
