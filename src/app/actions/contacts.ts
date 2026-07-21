'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

/**
 * Fetch all leads/contacts for the current user's organization.
 */
export async function getContactsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const contacts = await prisma.lead.findMany({
      where: {
        organizationId: session.organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, contacts };
  } catch (error: any) {
    console.error('[getContactsAction] Error:', error);
    return { error: 'Failed to fetch contacts.' };
  }
}

/**
 * Create a new lead/contact.
 */
export async function createContactAction(data: {
  name: string;
  email: string;
  jobTitle?: string;
  company?: string;
  linkedin?: string;
  country?: string;
  city?: string;
  state?: string;
}) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    if (!data.name || !data.email) {
      return { error: 'Name and Email are required.' };
    }

    const contact = await prisma.lead.create({
      data: {
        organizationId: session.organizationId,
        name: data.name,
        email: data.email,
        jobTitle: data.jobTitle,
        company: data.company,
        linkedin: data.linkedin,
        country: data.country,
        city: data.city,
        state: data.state,
      },
    });

    return { success: true, contact };
  } catch (error: any) {
    console.error('[createContactAction] Error:', error);
    return { error: 'Failed to create contact.' };
  }
}
