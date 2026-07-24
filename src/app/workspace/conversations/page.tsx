import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ConversationsClient from './ConversationsClient';

export default async function ConversationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // Fetch projects matching the user's access
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { organizationId: session.organizationId },
        { organization: { parentOrganizationId: session.organizationId } }
      ],
      ...(session.role === 'CLIENT' ? {
        OR: [
          { clientId: session.userId },
          { assignees: { some: { userId: session.userId } } }
        ]
      } : {})
    },
    select: {
      id: true,
      name: true,
      description: true,
      priority: true,
      clientId: true,
      projectManagerId: true,
      createdAt: true
    },
    orderBy: { name: 'asc' }
  });

  // Fetch all active users in the same organization
  const users = await prisma.user.findMany({
    where: {
      organizationId: session.organizationId,
      status: 'ACTIVE'
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true
    },
    orderBy: { name: 'asc' }
  });

  // Fetch current user details from DB
  const userDetails = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      organizationId: true
    }
  });

  // Fetch organization and its child organizations
  const organizations = await prisma.organization.findMany({
    where: {
      OR: [
        { id: session.organizationId },
        { parentOrganizationId: session.organizationId }
      ]
    },
    select: {
      id: true,
      name: true,
      parentOrganizationId: true
    }
  });

  return (
    <ConversationsClient
      currentUser={userDetails || {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
        organizationId: session.organizationId
      }}
      projects={projects}
      users={users}
      organizations={organizations}
    />
  );
}
