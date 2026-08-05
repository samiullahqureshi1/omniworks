import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient;

if (globalForPrisma.prisma && ('pinnedChat' in globalForPrisma.prisma) && ('pinnedTask' in globalForPrisma.prisma)) {
  prismaInstance = globalForPrisma.prisma;
} else {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/bridgeworkspace?schema=public';

  // Strip sslmode from the connection string and handle it explicitly in pool
  // options to avoid the pg deprecation warning about sslmode=require.
  const isRemote =
    connectionString.includes('neon.tech') ||
    connectionString.includes('supabase') ||
    connectionString.includes('railway') ||
    connectionString.includes('render') ||
    connectionString.includes('cloud') ||
    process.env.NODE_ENV === 'production';

  // Whether we're talking to a connection pooler (Neon's `-pooler` endpoint or
  // PgBouncer) rather than straight to Postgres.
  const isPooled =
    connectionString.includes('-pooler.') || connectionString.includes('pgbouncer=true');

  /**
   * Connections held PER APP INSTANCE.
   *
   * Without a pooler this had to stay small, because every serverless instance
   * opened its own connections and N instances × 20 exhausted Postgres. Behind a
   * pooler the pooler does the multiplexing, so each instance only needs enough
   * sockets to keep its own concurrent queries moving — a smaller pool actually
   * reduces contention and queueing.
   */
  const poolMax = Number(process.env.DB_POOL_MAX) || (isPooled ? 10 : 20);

  const pool = new pg.Pool({
    connectionString,
    max: poolMax,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    // Explicitly set ssl in pool options instead of sslmode= in the URL.
    // This silences the deprecation warning while keeping the same security level.
    ...(isRemote ? { ssl: { rejectUnauthorized: true } } : {}),
  });

  const adapter = new PrismaPg(pool);

  prismaInstance = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prismaInstance;
  }
}

export const prisma = prismaInstance;
export { Role, Priority } from '@prisma/client';
export type { ProjectStatus } from '@prisma/client';
