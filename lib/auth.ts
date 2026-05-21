export const adminCookieName = "altos_admin";

export function getAdminSessionToken() {
  if (process.env.ADMIN_SESSION_TOKEN) return process.env.ADMIN_SESSION_TOKEN;
  return process.env.NODE_ENV === "production" ? "" : "dev-admin-session";
}

export function getAdminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  return process.env.NODE_ENV === "production" ? "" : "altoslab-admin";
}

export function isAdminConfigured() {
  return Boolean(getAdminSessionToken() && getAdminPassword());
}
