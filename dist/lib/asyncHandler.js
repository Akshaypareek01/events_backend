/** Wraps async route handlers so rejections reach Express error middleware. */
export function asyncHandler(fn) {
    return (req, res, next) => {
        void fn(req, res, next).catch(next);
    };
}
