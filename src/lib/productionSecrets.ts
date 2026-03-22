const DEV_INSECURE_JWT = "dev-insecure-change-me";

/** Call once at startup. Exits process in production if JWT_SECRET is missing or weak. */
export function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== "production") return;
  const s = process.env.JWT_SECRET;
  if (!s || s === DEV_INSECURE_JWT || s.length < 32) {
    console.error(
      "[fatal] Production requires JWT_SECRET: set a random string of at least 32 characters (not the dev default).",
    );
    process.exit(1);
  }
}
