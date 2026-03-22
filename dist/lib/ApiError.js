/** Structured API error for consistent JSON responses. */
export class ApiError extends Error {
    status;
    code;
    details;
    constructor(status, message, options) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = options?.code;
        this.details = options?.details;
    }
}
