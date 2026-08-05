import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';

vi.mock('next/headers', () => ({ headers: vi.fn() }));

import { rateLimit, resetRateLimits, retryAfterMessage, RATE_LIMITS } from '@/lib/rate-limit';

beforeEach(() => {
  resetRateLimits();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('rate limiter', () => {
  const rule = { limit: 3, windowMs: 1000 };

  it('allows requests up to the limit, then rejects', () => {
    expect(rateLimit('k', rule).ok).toBe(true);
    expect(rateLimit('k', rule).ok).toBe(true);
    expect(rateLimit('k', rule).ok).toBe(true);

    const blocked = rateLimit('k', rule);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('reports remaining budget', () => {
    expect(rateLimit('k', rule).remaining).toBe(2);
    expect(rateLimit('k', rule).remaining).toBe(1);
    expect(rateLimit('k', rule).remaining).toBe(0);
  });

  it('keys are independent — one caller cannot exhaust another', () => {
    rateLimit('a', rule); rateLimit('a', rule); rateLimit('a', rule);
    expect(rateLimit('a', rule).ok).toBe(false);
    expect(rateLimit('b', rule).ok).toBe(true);
  });

  it('lets requests through again once the window slides past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    for (let i = 0; i < 3; i++) expect(rateLimit('slide', rule).ok).toBe(true);
    expect(rateLimit('slide', rule).ok).toBe(false);

    vi.setSystemTime(new Date('2026-01-01T00:00:01.500Z')); // past the 1s window
    expect(rateLimit('slide', rule).ok).toBe(true);
  });

  it('applies a lockout when blockMs is set, and lifts it after', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const locking = { limit: 2, windowMs: 1000, blockMs: 10_000 };
    rateLimit('lock', locking);
    rateLimit('lock', locking);

    const first = rateLimit('lock', locking);
    expect(first.ok).toBe(false);
    expect(first.retryAfterMs).toBe(10_000);

    // Still locked even though the sliding window itself has passed.
    vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));
    expect(rateLimit('lock', locking).ok).toBe(false);

    vi.setSystemTime(new Date('2026-01-01T00:00:11Z'));
    expect(rateLimit('lock', locking).ok).toBe(true);
  });

  it('login rule is strict enough to make brute force impractical', () => {
    const { limit, windowMs, blockMs } = RATE_LIMITS.LOGIN;
    expect(limit).toBeLessThanOrEqual(10);
    expect(windowMs).toBeGreaterThanOrEqual(60_000);
    expect(blockMs).toBeGreaterThan(0);
  });

  it('formats a human retry hint', () => {
    expect(retryAfterMessage(5_000)).toContain('5 seconds');
    expect(retryAfterMessage(1_000)).toContain('1 second');
    expect(retryAfterMessage(120_000)).toContain('2 minutes');
  });
});
