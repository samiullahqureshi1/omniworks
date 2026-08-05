/**
 * Cursor pagination for list queries.
 *
 * The project and task lists previously ran `findMany` with no `take`, so the
 * response grew without bound as an organization accumulated data — every page load
 * paid for the whole table. These helpers cap the page size and expose a cursor,
 * while keeping the existing `{ projects }` / `{ tasks }` response shape so current
 * callers keep working unchanged.
 *
 * Cursor pagination (rather than offset) is used because it stays correct when rows
 * are inserted or deleted between pages, and it doesn't get slower deeper into the
 * list the way a large OFFSET does.
 */

/** Returned when a caller doesn't ask for a specific size. */
export const DEFAULT_PAGE_SIZE = 100;
/** Hard ceiling, so a client can't request the whole table by passing take=999999. */
export const MAX_PAGE_SIZE = 200;

export type PageParams = {
  /** id of the last row from the previous page. */
  cursor?: string;
  /** Rows requested; clamped to MAX_PAGE_SIZE. */
  take?: number;
};

export type PageInfo = {
  nextCursor: string | null;
  hasMore: boolean;
};

/**
 * Turns page params into Prisma arguments. Fetches one extra row so we can tell
 * whether another page exists without running a second COUNT query.
 */
export function toPrismaPageArgs(params?: PageParams) {
  const requested = params?.take ?? DEFAULT_PAGE_SIZE;
  const take = Math.min(Math.max(1, requested), MAX_PAGE_SIZE);

  return {
    /** Pass straight into findMany. */
    args: {
      take: take + 1, // +1 probe row
      ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    },
    take,
  };
}

/**
 * Trims the probe row off and reports the cursor for the next page.
 * `rows` must be the result of a findMany built with `toPrismaPageArgs`.
 */
export function buildPage<T extends { id: string }>(rows: T[], take: number): { items: T[] } & PageInfo {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;

  return {
    items,
    hasMore,
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  };
}
