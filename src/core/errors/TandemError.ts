/**
 * Every failure the UI reacts to carries a code. Screens branch on the code,
 * never on message text, so copy can change without breaking behaviour.
 */
export const ErrorCodes = [
  'INVALID_INVITE',
  'HOUSEHOLD_NOT_FOUND',
  'MEMBER_NOT_FOUND',
  'ITEM_NOT_FOUND',
  'CHORE_NOT_FOUND',
  'LIST_NOT_FOUND',
  'INVALID_INPUT',
  'SYNC_UNAVAILABLE',
  'QUICK_ADD_UNAVAILABLE',
  'QUICK_ADD_INVALID_RESPONSE',
  'PERMISSION_DENIED',
  'UNKNOWN',
] as const;

export type ErrorCode = (typeof ErrorCodes)[number];

export class TandemError extends Error {
  override readonly name = 'TandemError';
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
  }
}

export function isTandemError(error: unknown, code?: ErrorCode): error is TandemError {
  return error instanceof TandemError && (code === undefined || error.code === code);
}

/** Wraps anything thrown into a TandemError, keeping the original as the cause. */
export function toTandemError(error: unknown, fallback: ErrorCode, message?: string): TandemError {
  if (error instanceof TandemError) return error;
  const detail = error instanceof Error ? error.message : String(error);
  return new TandemError(fallback, message ?? detail, { cause: error });
}
