/** Escape string for safe use inside RegExp / MongoDB $regex. */
export function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
