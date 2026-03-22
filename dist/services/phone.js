/** Normalize to 10-digit Indian mobile when possible. */
export function normalizePhone(raw) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 12 && digits.startsWith("91")) {
        return digits.slice(-10);
    }
    if (digits.length === 11 && digits.startsWith("0")) {
        return digits.slice(1);
    }
    if (digits.length >= 10) {
        return digits.slice(-10);
    }
    return digits;
}
