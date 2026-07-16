import { prisma } from '@/lib/db';

/** Turn arbitrary text into a URL-safe slug base. */
export function slugifyBase(input: string): string {
  return (
    (input || 'project')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'project'
  );
}

/**
 * Generate a unique project slug: `slugified-name` + a short random suffix,
 * retrying on the rare collision against the Project.slug unique index.
 */
export async function generateUniqueProjectSlug(name: string): Promise<string> {
  const base = slugifyBase(name);
  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix = Math.random().toString(16).slice(2, 8);
    const slug = `${base}-${suffix}`;
    const existing = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }
  // Extremely unlikely fallback
  return `${base}-${Date.now().toString(36)}`;
}
