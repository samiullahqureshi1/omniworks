import React from 'react';
import { getCurrentUser } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { getRulesAction, getRuleLogsAction } from '@/app/actions/rules';
import { getProjectsAction } from '@/app/actions/projects';
import RulesClient from './RulesClient';

export default async function RulesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== 'OWNER') {
    redirect('/workspace');
  }

  const rulesRes = await getRulesAction();
  const logsRes = await getRuleLogsAction();
  const projectsRes = await getProjectsAction();

  const initialRules = rulesRes.success ? rulesRes.rules || [] : [];
  const initialLogs = logsRes.success ? logsRes.logs || [] : [];
  const projects = projectsRes.success ? projectsRes.projects || [] : [];

  return (
    <RulesClient
      initialRules={initialRules}
      initialLogs={initialLogs}
      projects={projects}
      currentUser={currentUser}
    />
  );
}
