import { describe, expect, it } from 'vitest';
import {
  toPrismaPageArgs,
  buildPage,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@/lib/pagination';

const rows = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: `id-${i + offset}` }));

describe('pagination', () => {
  it('defaults to a bounded page size — lists are never unbounded', () => {
    const { args, take } = toPrismaPageArgs();
    expect(take).toBe(DEFAULT_PAGE_SIZE);
    // +1 probe row so hasMore needs no extra COUNT query.
    expect(args.take).toBe(DEFAULT_PAGE_SIZE + 1);
    expect(args).not.toHaveProperty('cursor');
  });

  it('clamps oversized requests so a client cannot ask for the whole table', () => {
    expect(toPrismaPageArgs({ take: 999_999 }).take).toBe(MAX_PAGE_SIZE);
    expect(toPrismaPageArgs({ take: 0 }).take).toBe(1);
    expect(toPrismaPageArgs({ take: -5 }).take).toBe(1);
  });

  it('builds cursor args that skip the cursor row itself', () => {
    const { args } = toPrismaPageArgs({ cursor: 'abc', take: 10 });
    expect(args.cursor).toEqual({ id: 'abc' });
    expect(args.skip).toBe(1);
    expect(args.take).toBe(11);
  });

  it('reports hasMore and trims the probe row', () => {
    const page = buildPage(rows(11), 10);
    expect(page.items).toHaveLength(10);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toBe('id-9');
  });

  it('reports the end of the list', () => {
    const page = buildPage(rows(7), 10);
    expect(page.items).toHaveLength(7);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('handles an empty result', () => {
    const page = buildPage([], 10);
    expect(page.items).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('walks pages without repeating or skipping rows', () => {
    const all = rows(25);
    const first = buildPage(all.slice(0, 11), 10);
    expect(first.items.map((r) => r.id)).toEqual(all.slice(0, 10).map((r) => r.id));

    // Second page starts after the cursor (Prisma's skip:1 does this server-side).
    const startIndex = all.findIndex((r) => r.id === first.nextCursor) + 1;
    const second = buildPage(all.slice(startIndex, startIndex + 11), 10);
    expect(second.items.map((r) => r.id)).toEqual(all.slice(10, 20).map((r) => r.id));
    expect(second.items.some((r) => first.items.some((f) => f.id === r.id))).toBe(false);
  });
});
