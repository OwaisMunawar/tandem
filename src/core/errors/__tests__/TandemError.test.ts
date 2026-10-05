import { isTandemError, TandemError, toTandemError } from '../TandemError';

describe('TandemError', () => {
  it('carries a code and keeps the cause', () => {
    const cause = new Error('socket closed');
    const error = toTandemError(cause, 'SYNC_UNAVAILABLE');
    expect(error).toBeInstanceOf(TandemError);
    expect(error).toMatchObject({ code: 'SYNC_UNAVAILABLE', message: 'socket closed', cause });
    expect(isTandemError(error, 'SYNC_UNAVAILABLE')).toBe(true);
    expect(isTandemError(error, 'UNKNOWN')).toBe(false);
    expect(isTandemError(cause)).toBe(false);
  });

  it('passes existing TandemErrors through and wraps non-errors', () => {
    const original = new TandemError('INVALID_INVITE', 'nope');
    expect(toTandemError(original, 'UNKNOWN')).toBe(original);
    expect(toTandemError('weird', 'UNKNOWN', 'Something went wrong')).toMatchObject({
      message: 'Something went wrong',
    });
    expect(toTandemError(42, 'UNKNOWN').message).toBe('42');
  });
});
