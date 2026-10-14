/**
 * The `viewed_*` cookie is the only proof that a browser owns a view log, so a
 * token must verify only when this server signed that exact log id.
 */
import { describe, expect, it } from 'bun:test';

import { signViewToken, verifyViewToken } from './view-token';

const SECRET = 'test-secret-for-view-tokens';
const LOG_ID = 'cl9ebqhxk00003b600tymydho';

describe('view token', () => {
  it('returns the log id from a token it signed', () => {
    expect(verifyViewToken(signViewToken(LOG_ID, SECRET), SECRET)).toBe(LOG_ID);
  });

  it('rejects a bare log id, the format before tokens were signed', () => {
    expect(verifyViewToken(LOG_ID, SECRET)).toBeNull();
  });

  it('rejects a forged signature', () => {
    expect(verifyViewToken(`${LOG_ID}.${'A'.repeat(43)}`, SECRET)).toBeNull();
    expect(verifyViewToken(`${LOG_ID}.`, SECRET)).toBeNull();
  });

  it('rejects a signature moved onto a different log id', () => {
    const [, signature] = signViewToken(LOG_ID, SECRET).split('.');

    expect(
      verifyViewToken(`cl9ebqhxk00009b600tymydzz.${signature}`, SECRET)
    ).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    expect(verifyViewToken(signViewToken(LOG_ID, 'other-secret'), SECRET)).toBe(
      null
    );
  });

  it.each([undefined, '', '.', 'no-separator'])(
    'rejects %p without throwing',
    (token) => {
      expect(verifyViewToken(token, SECRET)).toBeNull();
    }
  );

  it('signs with AUTH_SECRET from the environment by default', () => {
    expect(verifyViewToken(signViewToken(LOG_ID))).toBe(LOG_ID);
  });
});
