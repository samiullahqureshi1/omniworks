import { describe, expect, it, vi, beforeEach } from 'vitest';

// next/headers can only be imported inside a Next request scope, and we never want
// the real Prisma client in unit tests — stub both before importing the modules.
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/db', () => ({
  prisma: {
    project: { findFirst: vi.fn() },
    task: { findFirst: vi.fn() },
    user: { findFirst: vi.fn(), findUnique: vi.fn() },
    organization: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, getSession: vi.fn() };
});

import { prisma } from '@/lib/db';
import { getSession, type UserSession } from '@/lib/auth';
import {
  AuthError,
  NotFoundError,
  PERMISSION_MAP,
  PermissionError,
  requireContactAccess,
  requireEventAccess,
  requireMeetingAccess,
  assertCanAssignRole,
  assertNotLastOwner,
  assertProjectInOrganization,
  can,
  canManageMember,
  getUserPermissions,
  isSameOrganization,
  isViewRestricted,
  membershipPermissionKey,
  requireMembershipAccess,
  requireMembershipCreate,
  requireOrganizationResource,
  requirePermission,
  requireProjectAccess,
  requireTaskAccess,
  toErrorResponse,
} from '@/lib/permissions';

const ORG_A = 'org-a';
const ORG_B = 'org-b';

const mockedGetSession = vi.mocked(getSession);
/** Lazily attach/access a mocked prisma delegate without reaching for `any`. */
const prismaBag = prisma as unknown as Record<string, { findFirst: ReturnType<typeof vi.fn> }>;

const mockedPrisma = prisma as unknown as {
  project: { findFirst: ReturnType<typeof vi.fn> };
  task: { findFirst: ReturnType<typeof vi.fn> };
  user: { findFirst: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
};
// `count` is only needed by the last-owner guard, so add it lazily.
(prisma as unknown as { user: Record<string, unknown> }).user.count = vi.fn();

function session(overrides: Partial<UserSession> = {}): UserSession {
  return {
    userId: 'user-1',
    email: 'member@example.com',
    name: 'Member',
    role: 'MEMBER',
    organizationId: ORG_A,
    organizationName: 'Org A',
    permissions: {},
    ...overrides,
  };
}

const FULL_PROJECT = { project: { view: true, create: true, edit: true, delete: true } };
const FULL_TASK = { task: { view: true, create: true, edit: true, delete: true } };

function useSession(s: UserSession | null) {
  mockedGetSession.mockResolvedValue(s);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1 & 2: Project VIEW ────────────────────────────────────────────────────
describe('Project VIEW', () => {
  it('grants a member with PROJECT_VIEW access to all organization projects', () => {
    const s = session({ permissions: { project: { view: true } } });
    expect(can(s, 'PROJECT_VIEW')).toBe(true);
    expect(isViewRestricted(s, 'PROJECT_VIEW')).toBe(false);
  });

  it('restricts a member without PROJECT_VIEW to involvement-scoped records only', () => {
    const s = session({ permissions: {} });
    expect(can(s, 'PROJECT_VIEW')).toBe(false);
    expect(isViewRestricted(s, 'PROJECT_VIEW')).toBe(true);
  });
});

// ─── 3 & 4: Project CREATE ──────────────────────────────────────────────────
describe('Project CREATE', () => {
  it('allows a member holding PROJECT_CREATE', async () => {
    useSession(session({ permissions: { project: { create: true } } }));
    await expect(requirePermission('PROJECT_CREATE')).resolves.toBeTruthy();
  });

  it('rejects a direct request from a member without PROJECT_CREATE with 403', async () => {
    useSession(session({ permissions: { project: { view: true } } }));
    await expect(requirePermission('PROJECT_CREATE')).rejects.toBeInstanceOf(PermissionError);
    await expect(requirePermission('PROJECT_CREATE')).rejects.toMatchObject({ status: 403 });
  });
});

// ─── 5, 6, 7, 8: Project EDIT / DELETE + cross-org ─────────────────────────
describe('Project EDIT / DELETE', () => {
  it('lets a member with PROJECT_EDIT edit a project in their organization', async () => {
    useSession(session({ permissions: FULL_PROJECT }));
    mockedPrisma.project.findFirst.mockResolvedValue({
      id: 'p1', organizationId: ORG_A, projectManagerId: null, clientId: null, isInternal: false, assignees: [],
    });
    await expect(requireProjectAccess('p1', 'PROJECT_EDIT')).resolves.toMatchObject({ id: 'p1' });
  });

  it('cannot edit a project from another organization (404, never 403)', async () => {
    useSession(session({ permissions: FULL_PROJECT }));
    // Query is org-scoped, so a foreign project simply does not resolve.
    mockedPrisma.project.findFirst.mockResolvedValue(null);
    await expect(requireProjectAccess('p-in-org-b', 'PROJECT_EDIT')).rejects.toBeInstanceOf(NotFoundError);
    await expect(requireProjectAccess('p-in-org-b', 'PROJECT_EDIT')).rejects.toMatchObject({ status: 404 });
  });

  it('scopes every project lookup to the session organization', async () => {
    useSession(session({ permissions: FULL_PROJECT }));
    mockedPrisma.project.findFirst.mockResolvedValue({
      id: 'p1', organizationId: ORG_A, projectManagerId: null, clientId: null, isInternal: false, assignees: [],
    });
    await requireProjectAccess('p1', 'PROJECT_VIEW');
    expect(mockedPrisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1', organizationId: ORG_A } }),
    );
  });

  it('allows delete with PROJECT_DELETE and denies without it', async () => {
    const project = { id: 'p1', organizationId: ORG_A, projectManagerId: null, clientId: null, isInternal: false, assignees: [] };
    mockedPrisma.project.findFirst.mockResolvedValue(project);

    useSession(session({ permissions: FULL_PROJECT }));
    await expect(requireProjectAccess('p1', 'PROJECT_DELETE')).resolves.toBeTruthy();

    useSession(session({ permissions: { project: { view: true } } }));
    await expect(requireProjectAccess('p1', 'PROJECT_DELETE')).rejects.toBeInstanceOf(PermissionError);
  });

  it('lets the project manager edit even without the granular permission', async () => {
    useSession(session({ userId: 'pm-1', permissions: {} }));
    mockedPrisma.project.findFirst.mockResolvedValue({
      id: 'p1', organizationId: ORG_A, projectManagerId: 'pm-1', clientId: null, isInternal: false, assignees: [],
    });
    await expect(requireProjectAccess('p1', 'PROJECT_EDIT', { allowManager: true })).resolves.toBeTruthy();
  });
});

// ─── 9: Task VIEW / CREATE / EDIT / DELETE ─────────────────────────────────
describe('Task permissions', () => {
  const task = {
    id: 't1', organizationId: ORG_A, projectId: 'p1', assignees: [],
    project: { id: 'p1', organizationId: ORG_A, projectManagerId: null, clientId: null },
  };

  it.each([
    ['TASK_VIEW', 'view'],
    ['TASK_CREATE', 'create'],
    ['TASK_EDIT', 'edit'],
    ['TASK_DELETE', 'delete'],
  ] as const)('allows %s when granted and denies when not', async (key, action) => {
    mockedPrisma.task.findFirst.mockResolvedValue(task);

    useSession(session({ permissions: { task: { [action]: true } } }));
    await expect(requireTaskAccess('t1', key)).resolves.toMatchObject({ id: 't1' });

    useSession(session({ permissions: {} }));
    await expect(requireTaskAccess('t1', key)).rejects.toBeInstanceOf(PermissionError);
  });

  it('returns 404 for a task in another organization', async () => {
    useSession(session({ permissions: FULL_TASK }));
    mockedPrisma.task.findFirst.mockResolvedValue(null);
    await expect(requireTaskAccess('t-org-b', 'TASK_EDIT')).rejects.toMatchObject({ status: 404 });
  });

  it('rejects a task whose parent project belongs to another organization', async () => {
    useSession(session({ permissions: FULL_TASK }));
    mockedPrisma.task.findFirst.mockResolvedValue({
      ...task,
      project: { id: 'p1', organizationId: ORG_B, projectManagerId: null, clientId: null },
    });
    await expect(requireTaskAccess('t1', 'TASK_EDIT')).rejects.toBeInstanceOf(NotFoundError);
  });
});

// ─── 10: Task creation must reject a foreign project ───────────────────────
describe('Task creation project ownership', () => {
  it('rejects creating a task inside another organization\'s project', async () => {
    mockedPrisma.project.findFirst.mockResolvedValue(null); // org-scoped query finds nothing
    await expect(assertProjectInOrganization(session(), 'p-in-org-b')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('accepts a project that belongs to the caller organization', async () => {
    mockedPrisma.project.findFirst.mockResolvedValue({ id: 'p1', organizationId: ORG_A, projectManagerId: null });
    await expect(assertProjectInOrganization(session(), 'p1')).resolves.toMatchObject({ id: 'p1' });
  });
});

// ─── 11: Cross-organization isolation ──────────────────────────────────────
describe('Cross-organization isolation', () => {
  it('permissions in organization A do not grant access in organization B', () => {
    const inA = session({ organizationId: ORG_A, permissions: FULL_PROJECT });
    const inB = session({ organizationId: ORG_B, permissions: {} }); // different membership row

    expect(can(inA, 'PROJECT_DELETE')).toBe(true);
    expect(can(inB, 'PROJECT_DELETE')).toBe(false);
  });

  it('requireOrganizationResource rejects a resource from another organization', () => {
    const s = session({ organizationId: ORG_A });
    expect(isSameOrganization(s, ORG_A)).toBe(true);
    expect(isSameOrganization(s, ORG_B)).toBe(false);
    expect(() => requireOrganizationResource(s, ORG_B)).toThrow(NotFoundError);
    expect(() => requireOrganizationResource(s, ORG_A)).not.toThrow();
  });
});

// ─── 12: No re-login required ──────────────────────────────────────────────
describe('Permission changes take effect without re-login', () => {
  it('reflects updated permissions on the next request (DB is source of truth)', async () => {
    // Same token/identity, permissions revoked in the database between requests.
    useSession(session({ permissions: FULL_PROJECT }));
    expect(await getUserPermissions()).toEqual(FULL_PROJECT);
    await expect(requirePermission('PROJECT_DELETE')).resolves.toBeTruthy();

    useSession(session({ permissions: { project: { view: true } } }));
    await expect(requirePermission('PROJECT_DELETE')).rejects.toBeInstanceOf(PermissionError);
  });
});

// ─── 13: Owner / admin ─────────────────────────────────────────────────────
describe('Owner and administrator', () => {
  it('OWNER retains full access with an empty permission matrix', () => {
    const owner = session({ role: 'OWNER', permissions: {} });
    for (const key of ['PROJECT_VIEW', 'PROJECT_CREATE', 'PROJECT_EDIT', 'PROJECT_DELETE',
                       'TASK_VIEW', 'TASK_CREATE', 'TASK_EDIT', 'TASK_DELETE'] as const) {
      expect(can(owner, key)).toBe(true);
    }
    expect(isViewRestricted(owner, 'PROJECT_VIEW')).toBe(false);
  });

  it('MASTER_ADMIN bypasses the organization permission matrix', () => {
    expect(can(session({ role: 'MASTER_ADMIN', permissions: {} }), 'TASK_DELETE')).toBe(true);
  });

  it('a plain MEMBER does not inherit access from a role label alone', () => {
    expect(can(session({ role: 'MEMBER', permissions: {} }), 'TASK_DELETE')).toBe(false);
  });
});

// ─── User & Client modules ─────────────────────────────────────────────────
describe('User and Client modules', () => {
  const member = { id: 'm1', name: 'M', email: 'm@x.com', role: 'MEMBER', status: 'ACTIVE', organizationId: ORG_A };
  const client = { id: 'c1', name: 'C', email: 'c@x.com', role: 'CLIENT', status: 'ACTIVE', organizationId: ORG_A };

  it('routes the permission key by the TARGET record role, not by the screen', () => {
    expect(membershipPermissionKey('MEMBER', 'EDIT')).toBe('USER_EDIT');
    expect(membershipPermissionKey('OWNER', 'DELETE')).toBe('USER_DELETE');
    expect(membershipPermissionKey('CLIENT', 'EDIT')).toBe('CLIENT_EDIT');
    expect(membershipPermissionKey('CLIENT', 'VIEW')).toBe('CLIENT_VIEW');
  });

  it('USER_* permissions do not grant access to clients, and vice versa', async () => {
    // Holder of every USER_* permission, but nothing on the Client module.
    useSession(session({ permissions: { user: { view: true, create: true, edit: true, delete: true } } }));

    mockedPrisma.user.findFirst.mockResolvedValue(member);
    await expect(requireMembershipAccess('m1', 'EDIT')).resolves.toMatchObject({ target: { id: 'm1' } });

    mockedPrisma.user.findFirst.mockResolvedValue(client);
    await expect(requireMembershipAccess('c1', 'EDIT')).rejects.toBeInstanceOf(PermissionError);

    // And the mirror image.
    useSession(session({ permissions: { client: { view: true, edit: true, delete: true } } }));
    await expect(requireMembershipAccess('c1', 'EDIT')).resolves.toMatchObject({ target: { id: 'c1' } });
    mockedPrisma.user.findFirst.mockResolvedValue(member);
    await expect(requireMembershipAccess('m1', 'EDIT')).rejects.toBeInstanceOf(PermissionError);
  });

  it('returns 404 for a membership in another organization', async () => {
    useSession(session({ permissions: { user: { view: true, edit: true, delete: true } } }));
    mockedPrisma.user.findFirst.mockResolvedValue(null); // org-scoped query finds nothing
    await expect(requireMembershipAccess('m-in-org-b', 'EDIT')).rejects.toMatchObject({ status: 404 });
  });

  it('scopes the membership lookup to the session organization', async () => {
    useSession(session({ permissions: { user: { view: true, edit: true } } }));
    mockedPrisma.user.findFirst.mockResolvedValue(member);
    await requireMembershipAccess('m1', 'EDIT');
    expect(mockedPrisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'm1', organizationId: ORG_A } }),
    );
  });

  it('gates creation on the REQUESTED role module', async () => {
    useSession(session({ permissions: { user: { create: true } } }));
    await expect(requireMembershipCreate('MEMBER')).resolves.toBeTruthy();
    await expect(requireMembershipCreate('CLIENT')).rejects.toBeInstanceOf(PermissionError);

    useSession(session({ permissions: { client: { create: true } } }));
    await expect(requireMembershipCreate('CLIENT')).resolves.toBeTruthy();
    await expect(requireMembershipCreate('MEMBER')).rejects.toBeInstanceOf(PermissionError);
  });

  it('exposes a non-throwing helper for UI gating', () => {
    const s = session({ permissions: { client: { view: true } } });
    expect(canManageMember(s, 'CLIENT', 'VIEW')).toBe(true);
    expect(canManageMember(s, 'CLIENT', 'DELETE')).toBe(false);
    expect(canManageMember(s, 'MEMBER', 'VIEW')).toBe(false);
  });
});

// ─── Privilege escalation & last-owner protection ──────────────────────────
describe('Privilege escalation guards', () => {
  it('a member with USER_CREATE cannot mint an OWNER or MASTER_ADMIN', () => {
    const s = session({ role: 'MEMBER', permissions: { user: { create: true, edit: true } } });
    expect(() => assertCanAssignRole(s, 'OWNER')).toThrow(PermissionError);
    expect(() => assertCanAssignRole(s, 'MASTER_ADMIN')).toThrow(PermissionError);
    // Non-privileged roles are fine.
    expect(() => assertCanAssignRole(s, 'MEMBER')).not.toThrow();
    expect(() => assertCanAssignRole(s, 'CLIENT')).not.toThrow();
  });

  it('an OWNER may assign privileged roles', () => {
    const owner = session({ role: 'OWNER' });
    expect(() => assertCanAssignRole(owner, 'OWNER')).not.toThrow();
    expect(() => assertCanAssignRole(owner, 'MASTER_ADMIN')).not.toThrow();
  });

  it('blocks removing or demoting the last owner', async () => {
    mockedPrisma.user.count.mockResolvedValue(0); // no other active owners
    await expect(assertNotLastOwner(ORG_A, { id: 'o1', role: 'OWNER' })).rejects.toBeInstanceOf(PermissionError);
  });

  it('allows removing an owner when another active owner remains', async () => {
    mockedPrisma.user.count.mockResolvedValue(1);
    await expect(assertNotLastOwner(ORG_A, { id: 'o1', role: 'OWNER' })).resolves.toBeUndefined();
  });

  it('is a no-op for non-owner targets', async () => {
    await expect(assertNotLastOwner(ORG_A, { id: 'm1', role: 'MEMBER' })).resolves.toBeUndefined();
    expect(mockedPrisma.user.count).not.toHaveBeenCalled();
  });
});

// ─── CLIENT creation lockout ───────────────────────────────────────────────
describe('CLIENT cannot create projects or tasks', () => {
  it('denies PROJECT_CREATE and TASK_CREATE even when explicitly granted', () => {
    // A client whose matrix wrongly grants create on both modules.
    const client = session({
      role: 'CLIENT',
      permissions: {
        project: { view: true, create: true, edit: true, delete: true },
        task: { view: true, create: true, edit: true, delete: true },
      },
    });

    expect(can(client, 'PROJECT_CREATE')).toBe(false);
    expect(can(client, 'TASK_CREATE')).toBe(false);
  });

  it('rejects a direct create request from a client with 403', async () => {
    useSession(session({ role: 'CLIENT', permissions: { project: { create: true }, task: { create: true } } }));
    await expect(requirePermission('PROJECT_CREATE')).rejects.toBeInstanceOf(PermissionError);
    await expect(requirePermission('TASK_CREATE')).rejects.toBeInstanceOf(PermissionError);
  });

  it('blocks a client from planting a task in a project via requireMembershipCreate-style guards', async () => {
    useSession(session({ role: 'CLIENT', permissions: { task: { create: true } } }));
    mockedPrisma.task.findFirst.mockResolvedValue({
      id: 't1', organizationId: ORG_A, projectId: 'p1', assignees: [],
      project: { id: 'p1', organizationId: ORG_A, projectManagerId: null, clientId: 'user-1' },
    });
    await expect(requireTaskAccess('t1', 'TASK_CREATE')).rejects.toBeInstanceOf(PermissionError);
  });

  it('still lets a client VIEW the work shared with them', () => {
    const client = session({ role: 'CLIENT', permissions: { project: { view: true }, task: { view: true } } });
    expect(can(client, 'PROJECT_VIEW')).toBe(true);
    expect(can(client, 'TASK_VIEW')).toBe(true);
  });

  it('does not affect non-client roles', () => {
    const member = session({ role: 'MEMBER', permissions: { project: { create: true }, task: { create: true } } });
    expect(can(member, 'PROJECT_CREATE')).toBe(true);
    expect(can(member, 'TASK_CREATE')).toBe(true);
    expect(can(session({ role: 'OWNER', permissions: {} }), 'PROJECT_CREATE')).toBe(true);
  });
});

// ─── Planner sub-modules ───────────────────────────────────────────────────
describe('Planner sub-modules', () => {
  const planner = [
    ['CALENDAR_VIEW', 'calendar', 'view'],
    ['CALENDAR_EDIT', 'calendar', 'edit'],
    ['MEETING_VIEW', 'meeting', 'view'],
    ['MEETING_CREATE', 'meeting', 'create'],
    ['MEETING_EDIT', 'meeting', 'edit'],
    ['MEETING_DELETE', 'meeting', 'delete'],
    ['EVENT_VIEW', 'event', 'view'],
    ['EVENT_CREATE', 'event', 'create'],
    ['EVENT_EDIT', 'event', 'edit'],
    ['EVENT_DELETE', 'event', 'delete'],
    ['REMINDER_VIEW', 'reminder', 'view'],
    ['REMINDER_CREATE', 'reminder', 'create'],
    ['REMINDER_EDIT', 'reminder', 'edit'],
    ['REMINDER_DELETE', 'reminder', 'delete'],
    ['CONTACT_VIEW', 'contact', 'view'],
    ['CONTACT_CREATE', 'contact', 'create'],
    ['CONTACT_EDIT', 'contact', 'edit'],
    ['CONTACT_DELETE', 'contact', 'delete'],
    ['AVAILABILITY_VIEW', 'availability', 'view'],
    ['AVAILABILITY_EDIT', 'availability', 'edit'],
  ] as const;

  it.each(planner)('%s maps to %s.%s and is granted only when set', (key, resource, action) => {
    expect(PERMISSION_MAP[key]).toEqual({ resource, action });
    expect(can(session({ permissions: { [resource]: { [action]: true } } }), key)).toBe(true);
    expect(can(session({ permissions: {} }), key)).toBe(false);
  });

  it('each Planner sub-module is independent of the others', () => {
    const onlyMeetings = session({ permissions: { meeting: { view: true, create: true, edit: true, delete: true } } });
    expect(can(onlyMeetings, 'MEETING_DELETE')).toBe(true);
    expect(can(onlyMeetings, 'EVENT_VIEW')).toBe(false);
    expect(can(onlyMeetings, 'CONTACT_VIEW')).toBe(false);
    expect(can(onlyMeetings, 'AVAILABILITY_EDIT')).toBe(false);
    expect(can(onlyMeetings, 'CALENDAR_VIEW')).toBe(false);
  });

  it('CALENDAR_VIEW is NOT a master key for the items the calendar renders', () => {
    const calendarOnly = session({ permissions: { calendar: { view: true, edit: true } } });
    expect(can(calendarOnly, 'CALENDAR_VIEW')).toBe(true);
    // Items drawn on the calendar still need their own module permission.
    expect(can(calendarOnly, 'TASK_VIEW')).toBe(false);
    expect(can(calendarOnly, 'PROJECT_VIEW')).toBe(false);
    expect(can(calendarOnly, 'MEETING_VIEW')).toBe(false);
    expect(can(calendarOnly, 'EVENT_VIEW')).toBe(false);
    // …and CALENDAR_EDIT must not grant edit rights on another module.
    expect(can(calendarOnly, 'TASK_EDIT')).toBe(false);
  });

  it('legacy `planner` permissions do not silently grant the new sub-modules', () => {
    const legacy = session({ permissions: { planner: { view: true, edit: true, create: true, delete: true } } });
    for (const [key] of planner) expect(can(legacy, key)).toBe(false);
  });

  it('OWNER keeps full access to every Planner sub-module', () => {
    const owner = session({ role: 'OWNER', permissions: {} });
    for (const [key] of planner) expect(can(owner, key)).toBe(true);
  });

  it('scopes planner resource lookups to the session organization', async () => {
    useSession(session({ permissions: { meeting: { view: true } } }));
    prismaBag.meeting = { findFirst: vi.fn().mockResolvedValue({ id: 'mt1', organizationId: ORG_A }) };
    await requireMeetingAccess('mt1', 'MEETING_VIEW');
    expect(prismaBag.meeting.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'mt1', organizationId: ORG_A } }),
    );
  });

  it('returns 404 for planner resources in another organization', async () => {
    useSession(session({ permissions: { event: { view: true }, contact: { view: true } } }));
    prismaBag.plannerEvent = { findFirst: vi.fn().mockResolvedValue(null) };
    prismaBag.lead = { findFirst: vi.fn().mockResolvedValue(null) };
    await expect(requireEventAccess('e-org-b', 'EVENT_VIEW')).rejects.toMatchObject({ status: 404 });
    await expect(requireContactAccess('c-org-b', 'CONTACT_VIEW')).rejects.toMatchObject({ status: 404 });
  });

  it('returns 403 when the planner resource exists but the permission is missing', async () => {
    useSession(session({ permissions: {} }));
    prismaBag.meeting = { findFirst: vi.fn().mockResolvedValue({ id: 'mt1', organizationId: ORG_A }) };
    await expect(requireMeetingAccess('mt1', 'MEETING_DELETE')).rejects.toBeInstanceOf(PermissionError);
  });
});

// ─── 14: Unauthenticated + error mapping ───────────────────────────────────
describe('Unauthenticated access and error mapping', () => {
  it('throws 401 when there is no session', async () => {
    useSession(null);
    await expect(requirePermission('PROJECT_VIEW')).rejects.toBeInstanceOf(AuthError);
    await expect(requirePermission('PROJECT_VIEW')).rejects.toMatchObject({ status: 401 });
    expect(can(null, 'PROJECT_VIEW')).toBe(false);
  });

  it('maps guard errors onto HTTP status codes and hides internals', () => {
    expect(toErrorResponse(new AuthError())).toMatchObject({ status: 401 });
    expect(toErrorResponse(new PermissionError())).toMatchObject({ status: 403 });
    expect(toErrorResponse(new NotFoundError())).toMatchObject({ status: 404 });
    expect(toErrorResponse(new Error('connection string leaked'))).toEqual({
      status: 500,
      error: 'Internal server error',
    });
  });
});
