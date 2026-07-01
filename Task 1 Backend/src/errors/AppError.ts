export class AppError extends Error {
  public readonly httpStatus: number;
  public readonly code: string;
  public readonly details?: Array<{ field?: string; issue: string }>;

  constructor(
    httpStatus: number,
    code: string,
    message: string,
    details?: Array<{ field?: string; issue: string }>
  ) {
    super(message);
    this.name = 'AppError';
    this.httpStatus = httpStatus;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message);
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string, details?: Array<{ field?: string; issue: string }>) {
    super(400, code, message, details);
  }
}

export class UpstreamRateLimitError extends AppError {
  constructor(retryAfter: string) {
    super(503, 'UPSTREAM_RATE_LIMITED', 'NASA API rate limit exceeded', [
      { issue: `Retry after ${retryAfter}` },
    ]);
    this.retryAfter = retryAfter;
  }
  public readonly retryAfter: string;
}

export class UpstreamError extends AppError {
  constructor(message: string, details?: Array<{ field?: string; issue: string }>) {
    super(502, 'UPSTREAM_ERROR', message, details);
  }
}
