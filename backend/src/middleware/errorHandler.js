import { sendError } from "../utils/apiResponse.js";

const errorHandler = (err, req, res, next) => {
  console.error("[ERROR]", {
    message: err.message,
    code: err.code,
    detail: err.detail,
    query: err.query,
  });

  const status = err.status || 500;
  const message = err.message || "Internal server error";

  // For development, include more details
  const data = process.env.NODE_ENV === "production" ? {} : { error: err.message };

  if (res.headersSent) {
    return next(err);
  }

  sendError(res, message, status);
};

export default errorHandler;
