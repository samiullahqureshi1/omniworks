import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ContactsClient from './ContactsClient';
import { getContactsAction } from '@/app/actions/contacts';

export default async function ContactsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const result = await getContactsAction();

  if (result.error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-red-50 text-red-600 rounded-xl">
        Error loading contacts: {result.error}
      </div>
    );
  }

  return <ContactsClient contacts={result.contacts || []} />;
}
