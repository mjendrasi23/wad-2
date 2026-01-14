import { Request, Response, NextFunction } from "express";

/** @apiDefine HttpError
 *
 * @apiError {Number} code Error code
 * @apiError {String} message Human-readable error message
 *
 */

// new Error class
export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    // set the prototype explicitly, required for extending built-in classes
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// common error handler returns json with appropriate message
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
    const status = (err as any)?.status || 500;
    const message = (err as any)?.message || "Internal Server Error";
    console.error(`ERROR ${status}: ${message}`);
    res.status(status).json({ code: status, message });
}

