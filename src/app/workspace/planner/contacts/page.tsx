import React from 'react';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import ContactsClient from './ContactsClient';
import { getContactsAction, getUserViewPreferenceAction } from '@/app/actions/contacts';

export default async function ContactsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Direct URL access requires CONTACT_VIEW (owners/admins always pass).
  if (!can(session, 'CONTACT_VIEW')) {
    redirect('/workspace/planner/calendar');
  }

  const [result, prefResult] = await Promise.all([
    getContactsAction(),
    getUserViewPreferenceAction('contacts_columns'),
  ]);

  if (result.error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-red-50 text-red-600 rounded-xl">
        Error loading contacts: {result.error}
      </div>
    );
  }

  return (
    <ContactsClient
      contacts={result.contacts || []}
      initialColumns={(prefResult.preferences as string[]) || null}
    />
  );
}
