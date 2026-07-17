import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { prisma } from '@/lib/db';
import { unstable_cache } from 'next/cache';
import WorkspaceLayoutClient from './WorkspaceLayoutClient';

// Cache org/PM data per user for 30 seconds to avoid re-querying on every tab navigation.
// This is invalidated automatically after 30s or when the user switches org (via router.refresh).
const getLayoutData = unstable_cache(
  async (userId: string, userEmail: string, organizationId: string, role: string) => {
    const [pmProject, userRecords] = await Promise.all([
      role === 'MEMBER'
        ? prisma.project.findFirst({
            where: { projectManagerId: userId, organizationId },
            select: { id: true },
          })
        : Promise.resolve(null),
      prisma.user.findMany({
        where: { email: userEmail, status: 'ACTIVE' },
        select: {
          role: true,
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const isPM = !!pmProject;

    const baseOrganizations = userRecords.map((u: any) => ({
      id: u.organization.id,
      name: u.organization.name,
      role: u.role,
      isChild: false,
    }));

    // Fetch child orgs only if user is an owner somewhere
    const ownedOrgIds = userRecords
      .filter((u: any) => u.role === 'OWNER')
      .map((u: any) => u.organization.id);

    const childOrgs =
      ownedOrgIds.length > 0
        ? await prisma.organization.findMany({
            where: { parentOrganizationId: { in: ownedOrgIds } },
            select: { id: true, name: true },
          })
        : [];

    const childOrganizations = childOrgs.map((org: any) => ({
      id: org.id,
      name: org.name,
      role: 'OWNER',
      isChild: true,
    }));

    return {
      isPM,
      userOrganizations: [...baseOrganizations, ...childOrganizations],
    };
  },
  // Cache key parts — unique per user+org combination
  ['workspace-layout'],
  { revalidate: 30, tags: ['workspace-layout'] }
);

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/logout');
  }

  // Use cached layout data — avoids 3 DB queries on every tab navigation
  const { isPM, userOrganizations } = await getLayoutData(
    user.userId,
    user.email,
    user.organizationId,
    user.role
  );

  // Whether this org has connected Google Calendar (gates the Planner UI).
  // Uncached so it reflects a fresh connect immediately.
  const orgSettings = await prisma.organizationSettings.findUnique({
    where: { organizationId: user.organizationId },
    select: { googleRefreshToken: true },
  });
  const googleConnected = !!orgSettings?.googleRefreshToken;

  return (
    <WorkspaceLayoutClient
      user={{...user, isPM}}
      userOrganizations={userOrganizations}
      googleConnected={googleConnected}
    >
      {children}
    </WorkspaceLayoutClient>
  );
}
