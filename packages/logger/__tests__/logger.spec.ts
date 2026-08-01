import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';

import { Logger, logger } from '../src';

describe('Logger', () => {
  let log: ReturnType<typeof spyOn>;
  let warn: ReturnType<typeof spyOn>;
  let error: ReturnType<typeof spyOn>;

  beforeEach(() => {
    log = spyOn(console, 'log').mockImplementation(() => {});
    warn = spyOn(console, 'warn').mockImplementation(() => {});
    error = spyOn(console, 'error').mockImplementation(() => {});
    // The level is module-global state — reset it so test order can't matter.
    logger.setLogLevel('debug');
    log.mockClear();
  });

  afterEach(() => {
    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });

  it('routes each level to the matching console method', () => {
    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(log).toHaveBeenCalledTimes(2); // debug + info
    expect(warn).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('includes the message, level and namespace in the payload', () => {
    logger.info('hello world', { requestId: 'r1' });

    const out = log.mock.calls[0][0] as string;
    expect(out).toContain('hello world');
    expect(out).toContain('"level": "info"');
    expect(out).toContain('"namespace": "byte-of-me"');
    expect(out).toContain('"requestId": "r1"');
  });

  it('suppresses entries below the configured level', () => {
    logger.setLogLevel('error');
    log.mockClear();

    logger.debug('nope');
    logger.info('nope');
    logger.warn('nope');
    logger.error('yes');

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('silences everything on "silent"', () => {
    logger.setLogLevel('silent');
    log.mockClear();

    logger.error('nope');

    expect(error).not.toHaveBeenCalled();
  });

  it('rejects an invalid level and keeps the current one', () => {
    logger.setLogLevel('debug');
    logger.setLogLevel('loud' as never);

    expect(logger.getLogLevel()).toBe('debug');
    // The rejection itself is reported as a warning.
    expect(warn).toHaveBeenCalled();
  });

  it('a named logger stamps its own namespace', () => {
    const named = new Logger('worker');
    named.info('task done');

    const out = log.mock.calls[log.mock.calls.length - 1][0] as string;
    expect(out).toContain('"namespace": "worker"');
  });
});
