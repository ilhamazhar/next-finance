import "server-only";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} env var is required`);
  return value;
}

export const env = {
  backendUrl: required("BACKEND_API_URL", process.env.BACKEND_API_URL),
  cookieName: process.env.COOKIE_NAME || "azhar_rt",
  cookieSecure: process.env.COOKIE_SECURE === "1",
};
