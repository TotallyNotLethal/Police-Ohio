import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from '@/lib/env/supabase';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(getDatabaseUrl()
      ? {
          datasources: {
            db: {
              url: getDatabaseUrl(),
            },
          },
        }
      : {}),
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
