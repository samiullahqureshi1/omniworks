import { prisma } from './db';
import {
  getSession,
  hasPermission as hasResourcePermission,
  type PermissionAction,
  type PermissionResource,
  type Permissions,
  type UserSession,
} from './auth';

/**
 * Centralised authorization layer for Project and Task modules.
 *
 * Design notes:
 *  - The `User` row IS the organization membership (unique on [email, organizationId]),
 *    so permissions stored on it are already organization-specific by construction.
 *  - Permissions are read from the DATABASE on every request (see `getSession`), never
 *    trusted from the JWT, so permission changes take effect without re-login.
 *  - Never trust organizationId / projectId / role / permissions supplied by the client.
 *    Everything here resolves from the authenticated session + database.
 */

// ─── Permission keys ────────────────────────────────────────────────────────
export const PERMISSION_KEYS = [
  'PROJECT_VIEW',
  'PROJECT_CREATE',
  'PROJECT_EDIT',
  'PROJECT_DELETE',
  'TASK_VIEW',
  'TASK_CREATE',
  'TASK_EDIT',
  'TASK_DELETE',
  'USER_VIEW',
  'USER_CREATE',
  'USER_EDIT',
  'USER_DELETE',
  'CLIENT_VIEW',
  'CLIENT_CREATE',
  'CLIENT_EDIT',
  'CLIENT_DELETE',
  // ── Planner sub-modules ──
  'CALENDAR_VIEW',
  'CALENDAR_EDIT',
  'MEETING_VIEW',
  'MEETING_CREATE',
  'MEETING_EDIT',
  'MEETING_DELETE',
  'EVENT_VIEW',
  'EVENT_CREATE',
  'EVENT_EDIT',
  'EVENT_DELETE',
  'REMINDER_VIEW',
  'REMINDER_CREATE',
  'REMINDER_EDIT',
  'REMINDER_DELETE',
  'CONTACT_VIEW',
  'CONTACT_CREATE',
  'CONTACT_EDIT',
  'CONTACT_DELETE',
  'AVAILABILITY_VIEW',
  'AVAILABILITY_EDIT',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/** Maps a flat permission key onto the {resource, action} shape stored in User.permissions. */
export const PERMISSION_MAP: Record<PermissionKey, { resource: PermissionResource; action: PermissionAction }> = {
  PROJECT_VIEW: { resource: 'project', action: 'view' },
  PROJECT_CREATE: { resource: 'project', action: 'create' },
  PROJECT_EDIT: { resource: 'project', action: 'edit' },
  PROJECT_DELETE: { resource: 'project', action: 'delete' },
  TASK_VIEW: { resource: 'task', action: 'view' },
  TASK_CREATE: { resource: 'task', action: 'create' },
  TASK_EDIT: { resource: 'task', action: 'edit' },
  TASK_DELETE: { resource: 'task', action: 'delete' },
  USER_VIEW: { resource: 'user', action: 'view' },
  USER_CREATE: { resource: 'user', action: 'create' },
  USER_EDIT: { resource: 'user', action: 'edit' },
  USER_DELETE: { resource: 'user', action: 'delete' },
  CLIENT_VIEW: { resource: 'client', action: 'view' },
  CLIENT_CREATE: { resource: 'client', action: 'create' },
  CLIENT_EDIT: { resource: 'client', action: 'edit' },
  CLIENT_DELETE: { resource: 'client', action: 'delete' },
  // Planner sub-modules. Calendar and Availability intentionally expose only
  // VIEW/EDIT — they have no create/delete surface.
  CALENDAR_VIEW: { resource: 'calendar', action: 'view' },
  CALENDAR_EDIT: { resource: 'calendar', action: 'edit' },
  MEETING_VIEW: { resource: 'meeting', action: 'view' },
  MEETING_CREATE: { resource: 'meeting', action: 'create' },
  MEETING_EDIT: { resource: 'meeting', action: 'edit' },
  MEETING_DELETE: { resource: 'meeting', action: 'delete' },
  EVENT_VIEW: { resource: 'event', action: 'view' },
  EVENT_CREATE: { resource: 'event', action: 'create' },
  EVENT_EDIT: { resource: 'event', action: 'edit' },
  EVENT_DELETE: { resource: 'event', action: 'delete' },
  REMINDER_VIEW: { resource: 'reminder', action: 'view' },
  REMINDER_CREATE: { resource: 'reminder', action: 'create' },
  REMINDER_EDIT: { resource: 'reminder', action: 'edit' },
  REMINDER_DELETE: { resource: 'reminder', action: 'delete' },
  CONTACT_VIEW: { resource: 'contact', action: 'view' },
  CONTACT_CREATE: { resource: 'contact', action: 'create' },
  CONTACT_EDIT: { resource: 'contact', action: 'edit' },
  CONTACT_DELETE: { resource: 'contact', action: 'delete' },
  AVAILABILITY_VIEW: { resource: 'availability', action: 'view' },
  AVAILABILITY_EDIT: { resource: 'availability', action: 'edit' },
};

// ─── Typed errors (map cleanly onto HTTP status codes) ──────────────────────
export class AuthError extends Error {
  readonly status = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export class PermissionError extends Error {
  readonly status = 403;
  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Used when a resource does not exist *in the caller's organization*. We deliberately
 * return 404 (not 403) so we never disclose that a resource exists in another org.
 */
export class NotFoundError extends Error {
  readonly status = 404;
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/** Normalises any thrown guard error into a {status, error} pair for API routes / actions. */
export function toErrorResponse(error: unknown): { status: number; error: string } {
  if (error instanceof AuthError || error instanceof PermissionError || error instanceof NotFoundError) {
    return { status: error.status, error: error.message };
  }
  return { status: 500, error: 'Internal server error' };
}

// ─── Pure permission resolution (unit-testable, no DB) ──────────────────────

/**
 * Resolve a permission key against a session. Pure — no I/O.
 *
 * Role semantics (matches the existing platform architecture):
 *  - OWNER and MASTER_ADMIN always have every permission.
 *  - MEMBER uses the granular permission matrix.
 *  - CLIENT is additionally hard-restricted to their own projects/tasks by the query
 *    layer; permissions can only narrow that further, never widen it.
 */
export function can(session: UserSession | null | undefined, key: PermissionKey): boolean {
  if (!session) return false;
  const { resource, action } = PERMISSION_MAP[key];
  return hasResourcePermission(session, resource, action);
}

/** True when the resource's organization matches the session's active organization. */
export function isSameOrganization(
  session: UserSession | null | undefined,
  resourceOrganizationId: string | null | undefined
): boolean {
  if (!session || !resourceOrganizationId) return false;
  return session.organizationId === resourceOrganizationId;
}

/**
 * Whether a MEMBER should be limited to only the records they are involved with.
 * A member WITHOUT the module's VIEW permission still sees work assigned to them or
 * projects they manage — this preserves existing product behaviour.
 */
export function isViewRestricted(session: UserSession | null | undefined, key: PermissionKey): boolean {
  if (!session) return true;
  if (session.role === 'OWNER' || session.role === 'MASTER_ADMIN') return false;
  return !can(session, key);
}

// ─── Session / membership helpers ───────────────────────────────────────────

/** The authenticated membership (session) or throw 401. */
export async function getCurrentMembership(): Promise<UserSession> {
  const session = await getSession();
  if (!session) throw new AuthError();
  return session;
}

/** Fresh permissions straight from the database for the current membership. */
export async function getUserPermissions(): Promise<Permissions> {
  const session = await getSession();
  if (!session) return {};
  return session.permissions ?? {};
}

/** Non-throwing check against the current session. */
export async function hasPermission(key: PermissionKey): Promise<boolean> {
  const session = await getSession();
  return can(session, key);
}

/** Throws 401 when unauthenticated, 403 when the permission is missing. */
export async function requirePermission(key: PermissionKey): Promise<UserSession> {
  const session = await getCurrentMembership();
  if (!can(session, key)) throw new PermissionError();
  return session;
}

/** Throws when a resource does not belong to the caller's active organization. */
export function requireOrganizationResource(
  session: UserSession,
  resourceOrganizationId: string | null | undefined
): void {
  if (!isSameOrganization(session, resourceOrganizationId)) throw new NotFoundError();
}

// ─── Resource guards (org scoping + permission in one call) ─────────────────

type AccessOptions = {
  /** Allow the project's manager to pass even without the granular permission. */
  allowManager?: boolean;
  /** Allow a user assigned to the record to pass even without the granular permission. */
  allowAssignee?: boolean;
};

/**
 * Loads a project scoped to the caller's organization and enforces `key`.
 * Returns the project so callers don't need a second query.
 *
 * Throws 401 / 403 / 404. Never reveals that a project exists in another organization.
 */
export async function requireProjectAccess(
  projectId: string,
  key: PermissionKey,
  options: AccessOptions = {}
) {
  const session = await getCurrentMembership();

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.organizationId },
    select: {
      id: true,
      organizationId: true,
      projectManagerId: true,
      clientId: true,
      isInternal: true,
      assignees: { select: { userId: true } },
    },
  });

  // 404 (not 403) — do not disclose cross-organization existence.
  if (!project) throw new NotFoundError('Project not found');

  // CLIENT stays restricted to their own projects regardless of the matrix.
  if (session.role === 'CLIENT') {
    const isOwnProject =
      project.clientId === session.userId ||
      project.assignees.some((a) => a.userId === session.userId);
    if (!isOwnProject) throw new NotFoundError('Project not found');
  }

  if (can(session, key)) return project;
  if (options.allowManager && project.projectManagerId === session.userId) return project;
  if (options.allowAssignee && project.assignees.some((a) => a.userId === session.userId)) return project;

  throw new PermissionError();
}

/**
 * Loads a task scoped to the caller's organization and enforces `key`.
 * Also guarantees the task's project belongs to the same organization.
 */
export async function requireTaskAccess(taskId: string, key: PermissionKey, options: AccessOptions = {}) {
  const session = await getCurrentMembership();

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: session.organizationId },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      assignees: { select: { userId: true } },
      project: {
        select: { id: true, organizationId: true, projectManagerId: true, clientId: true },
      },
    },
  });

  if (!task) throw new NotFoundError('Task not found');

  // Defence in depth: the parent project must live in the same organization.
  if (task.project && task.project.organizationId !== session.organizationId) {
    throw new NotFoundError('Task not found');
  }

  if (session.role === 'CLIENT' && task.project?.clientId !== session.userId) {
    throw new NotFoundError('Task not found');
  }

  if (can(session, key)) return task;
  if (options.allowManager && task.project?.projectManagerId === session.userId) return task;
  if (options.allowAssignee && task.assignees.some((a) => a.userId === session.userId)) return task;

  throw new PermissionError();
}

// ─── Planner resource guards ────────────────────────────────────────────────
// Same contract as requireProjectAccess: org-scoped lookup, 404 for anything that
// is not in the caller's organization, 403 when the permission is missing.

export async function requireMeetingAccess(meetingId: string, key: PermissionKey) {
  const session = await getCurrentMembership();

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, organizationId: session.organizationId },
    select: { id: true, organizationId: true, pmId: true, clientId: true, projectId: true },
  });

  if (!meeting) throw new NotFoundError('Meeting not found');
  if (!can(session, key)) throw new PermissionError();

  return { session, meeting };
}

export async function requireEventAccess(eventId: string, key: PermissionKey) {
  const session = await getCurrentMembership();

  const event = await prisma.plannerEvent.findFirst({
    where: { id: eventId, organizationId: session.organizationId },
    select: { id: true, organizationId: true, assignedToId: true, projectId: true },
  });

  if (!event) throw new NotFoundError('Event not found');
  if (!can(session, key)) throw new PermissionError();

  return { session, event };
}

/** Contacts are Lead records; they are org-scoped like every other planner entity. */
export async function requireContactAccess(contactId: string, key: PermissionKey) {
  const session = await getCurrentMembership();

  const contact = await prisma.lead.findFirst({
    where: { id: contactId, organizationId: session.organizationId },
    select: { id: true, organizationId: true },
  });

  if (!contact) throw new NotFoundError('Contact not found');
  if (!can(session, key)) throw new PermissionError();

  return { session, contact };
}

// ─── User / Client (membership) guards ──────────────────────────────────────
//
// In this platform a "client" is not a separate entity: it is a User row whose
// role is CLIENT, living in the same organization. Both the Users page and the
// Clients page are backed by the same membership actions. So the module a request
// belongs to is decided by the ROLE OF THE TARGET record, not by which screen the
// request came from — that is what keeps USER_* and CLIENT_* cleanly separated
// while reusing one set of server actions.

export type MembershipAction = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE';
export type MemberRole = UserSession['role'];

/** Roles that must never be granted by someone who is not already privileged. */
const PRIVILEGED_ROLES: MemberRole[] = ['OWNER', 'MASTER_ADMIN'];

/** CLIENT-role records belong to the Client module; everything else to the User module. */
export function membershipPermissionKey(targetRole: MemberRole, action: MembershipAction): PermissionKey {
  return (targetRole === 'CLIENT' ? `CLIENT_${action}` : `USER_${action}`) as PermissionKey;
}

/** Non-throwing variant, for UI gating. */
export function canManageMember(
  session: UserSession | null | undefined,
  targetRole: MemberRole,
  action: MembershipAction
): boolean {
  return can(session, membershipPermissionKey(targetRole, action));
}

/**
 * Blocks privilege escalation: only an existing OWNER / MASTER_ADMIN may grant the
 * OWNER or MASTER_ADMIN role. A member with USER_CREATE/USER_EDIT cannot promote
 * anyone (including themselves) into a privileged role.
 */
export function assertCanAssignRole(session: UserSession, targetRole: MemberRole): void {
  if (!PRIVILEGED_ROLES.includes(targetRole)) return;
  if (session.role === 'OWNER' || session.role === 'MASTER_ADMIN') return;
  throw new PermissionError('You are not allowed to assign the OWNER or MASTER_ADMIN role.');
}

/**
 * Protects the final OWNER of an organization from being demoted, deactivated or
 * removed, which would otherwise leave the organization unadministrable.
 * Only meaningful when the target is itself an OWNER.
 */
export async function assertNotLastOwner(
  organizationId: string,
  target: { id: string; role: MemberRole }
): Promise<void> {
  if (target.role !== 'OWNER') return;

  const remainingOwners = await prisma.user.count({
    where: {
      organizationId,
      role: 'OWNER',
      status: 'ACTIVE',
      NOT: { id: target.id },
    },
  });

  if (remainingOwners === 0) {
    throw new PermissionError(
      'This is the last owner of the organization and cannot be removed or demoted.'
    );
  }
}

/**
 * Loads a membership scoped to the caller's organization and enforces the correct
 * module permission (USER_* or CLIENT_*) based on the target's role.
 *
 * Throws 401 / 403 / 404. A membership in another organization yields 404, so we
 * never disclose that the account exists elsewhere.
 */
export async function requireMembershipAccess(targetUserId: string, action: MembershipAction) {
  const session = await getCurrentMembership();

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, organizationId: session.organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      organizationId: true,
    },
  });

  if (!target) throw new NotFoundError('User not found');

  const key = membershipPermissionKey(target.role as MemberRole, action);
  if (!can(session, key)) throw new PermissionError();

  return { session, target: { ...target, role: target.role as MemberRole } };
}

/**
 * Permission gate for creating a membership. The requested role decides the module:
 * inviting a CLIENT needs CLIENT_CREATE, inviting anyone else needs USER_CREATE.
 * Also blocks privilege escalation via the requested role.
 */
export async function requireMembershipCreate(targetRole: MemberRole) {
  const session = await requirePermission(membershipPermissionKey(targetRole, 'CREATE'));
  assertCanAssignRole(session, targetRole);
  return session;
}

/**
 * Verifies a project id supplied by the client belongs to the caller's organization.
 * Use before creating a task so a user can never plant a task in another org's project.
 */
export async function assertProjectInOrganization(session: UserSession, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.organizationId },
    select: { id: true, organizationId: true, projectManagerId: true },
  });
  if (!project) throw new NotFoundError('Project not found');
  return project;
}
