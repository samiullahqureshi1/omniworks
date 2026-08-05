'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Saved time reports.
 *
 * A report row stores only the FILTERS (its `config`), never a snapshot of the rows —
 * so opening a saved report re-runs it against current time entries. Every query is
 * scoped to the caller's organization; the organizationId is never taken from input.
 */

export interface ReportConfig {
  project: string;
  user: string;
  task: string;
  fromDate: string;
  toDate: string;
  timePeriod: string;
}

function parseConfig(raw: string): ReportConfig | null {
  try {
    const c = JSON.parse(raw);
    return {
      project: typeof c.project === 'string' ? c.project : 'all',
      user: typeof c.user === 'string' ? c.user : 'all',
      task: typeof c.task === 'string' ? c.task : 'all',
      fromDate: typeof c.fromDate === 'string' ? c.fromDate : '',
      toDate: typeof c.toDate === 'string' ? c.toDate : '',
      timePeriod: typeof c.timePeriod === 'string' ? c.timePeriod : 'Week',
    };
  } catch {
    return null;
  }
}

export async function saveReportAction(input: { name: string; config: ReportConfig }) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const name = (input.name || '').trim();
    if (!name) return { error: 'A report name is required.' };

    const report = await prisma.report.create({
      data: {
        name,
        type: 'TIME',
        config: JSON.stringify(input.config ?? {}),
        organizationId: session.organizationId, // always from the session
        createdBy: session.userId,
      },
      select: { id: true, name: true, config: true, createdAt: true, createdBy: true },
    });

    revalidatePath('/workspace/time');
    return { success: true, report };
  } catch (error) {
    console.error('saveReportAction failed:', error);
    return { error: 'Failed to save report.' };
  }
}

export async function getSavedReportsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const rows = await prisma.report.findMany({
      where: { organizationId: session.organizationId, type: 'TIME' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, config: true, createdAt: true, createdBy: true },
      take: 200,
    });

    const reports = rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      config: parseConfig(r.config),
    }));

    return { success: true, reports };
  } catch (error) {
    console.error('getSavedReportsAction failed:', error);
    return { error: 'Failed to load saved reports.' };
  }
}

/** Loads one saved report — used when opening a shared link. 404s across organizations. */
export async function getSavedReportAction(id: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const r = await prisma.report.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true, name: true, config: true, createdAt: true, createdBy: true },
    });

    if (!r) return { error: 'Report not found.' };

    return {
      success: true,
      report: { id: r.id, name: r.name, createdAt: r.createdAt, createdBy: r.createdBy, config: parseConfig(r.config) },
    };
  } catch (error) {
    console.error('getSavedReportAction failed:', error);
    return { error: 'Failed to load report.' };
  }
}

export async function deleteSavedReportAction(id: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Org-scoped existence check first, so a foreign id simply reads as not found.
    const existing = await prisma.report.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true },
    });
    if (!existing) return { error: 'Report not found.' };

    await prisma.report.delete({ where: { id: existing.id } });

    revalidatePath('/workspace/time');
    return { success: true };
  } catch (error) {
    console.error('deleteSavedReportAction failed:', error);
    return { error: 'Failed to delete report.' };
  }
}
