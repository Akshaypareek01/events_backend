/** Normalize domain: lowercase, strip leading @, trim. */
export function normalizeCompanyDomain(input) {
    return input.trim().toLowerCase().replace(/^@+/, "");
}
/** Domain part of an email, lowercased, or null if invalid. */
export function extractEmailDomain(email) {
    const parts = email.trim().toLowerCase().split("@");
    if (parts.length !== 2 || !parts[1])
        return null;
    return parts[1];
}
