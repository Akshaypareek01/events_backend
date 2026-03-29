/** Escape a string for safe use inside a MongoDB / JS RegExp. */
export function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
