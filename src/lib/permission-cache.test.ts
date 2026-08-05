import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  getCachedMembership,
  invalidateUserPermissions,
  invalidateAllPermissions,
  permissionCacheStats,
  membershipCacheKey,
} from '@/lib/permission-cache';

const EMAIL = 'member@example.com';
const ORG = 'org-a';

beforeEach(() => {
  invalidateAllPermissions();
});

describe('permission cache', () => {
  it('runs the loader on a miss and reuses the value on a hit', async () => {
    const loader = vi.fn().mockResolvedValue({
      id: 'u1',
      role: 'MEMBER',
      permissions: { project: { view: true } },
    });

    const first = await getCachedMembership(EMAIL, ORG, loader);
    const second = await getCachedMembership(EMAIL, ORG, loader);

    expect(first).toEqual(second);
    // The whole point: one database round trip, not one per request.
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('re-reads after the entry is invalidated — no stale permissions', async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce({ id: 'u1', role: 'MEMBER', permissions: { project: { view: true, delete: true } } })
      .mockResolvedValueOnce({ id: 'u1', role: 'MEMBER', permissions: { project: { view: true } } });

    const before = await getCachedMembership(EMAIL, ORG, loader);
    expect(before?.permissions?.project?.delete).toBe(true);

    // Simulates an owner revoking delete via editUserAction.
    invalidateUserPermissions('u1');

    const after = await getCachedMembership(EMAIL, ORG, loader);
    expect(after?.permissions?.project?.delete).toBeUndefined();
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('invalidates by userId even when the id was not indexed (fallback scan)', async () => {
    const loader = vi.fn().mockResolvedValue({ id: 'u-scan', role: 'MEMBER', permissions: {} });
    await getCachedMembership(EMAIL, ORG, loader);

    expect(permissionCacheStats().size).toBe(1);
    invalidateUserPermissions('u-scan');
    expect(permissionCacheStats().size).toBe(0);
  });

  it('keeps separate entries per organization (no cross-tenant bleed)', async () => {
    const loaderA = vi.fn().mockResolvedValue({ id: 'u-a', role: 'OWNER', permissions: {} });
    const loaderB = vi.fn().mockResolvedValue({ id: 'u-b', role: 'CLIENT', permissions: {} });

    const a = await getCachedMembership(EMAIL, 'org-a', loaderA);
    const b = await getCachedMembership(EMAIL, 'org-b', loaderB);

    expect(a?.role).toBe('OWNER');
    expect(b?.role).toBe('CLIENT');
    expect(loaderA).toHaveBeenCalledTimes(1);
    expect(loaderB).toHaveBeenCalledTimes(1);
  });

  it('caches a null membership so a missing row does not re-query every request', async () => {
    const loader = vi.fn().mockResolvedValue(null);

    expect(await getCachedMembership(EMAIL, ORG, loader)).toBeNull();
    expect(await getCachedMembership(EMAIL, ORG, loader)).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('invalidating one user does not evict another', async () => {
    await getCachedMembership('a@x.com', ORG, vi.fn().mockResolvedValue({ id: 'u1', role: 'MEMBER', permissions: {} }));
    await getCachedMembership('b@x.com', ORG, vi.fn().mockResolvedValue({ id: 'u2', role: 'MEMBER', permissions: {} }));

    expect(permissionCacheStats().size).toBe(2);
    invalidateUserPermissions('u1');
    expect(permissionCacheStats().size).toBe(1);
  });

  it('builds a key from email + organization', () => {
    expect(membershipCacheKey('x@y.com', 'org-1')).toBe('x@y.com:org-1');
  });
});
