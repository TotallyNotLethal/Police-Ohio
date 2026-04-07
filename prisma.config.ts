import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const isPostgresUrl = (value: string | undefined) => Boolean(value && /^postgres(ql)?:\/\//i.test(value));

const dbUrlCandidates: Array<[name: string, value: string | undefined]> = [
  ['DATABASE_URL', process.env.DATABASE_URL],
  ['SUPABASE_DATABASE_URL', process.env.SUPABASE_DATABASE_URL],
  ['POSTGRES_PRISMA_URL', process.env.POSTGRES_PRISMA_URL],
  ['POSTGRES_URL_NON_POOLING', process.env.POSTGRES_URL_NON_POOLING],
  ['POSTGRES_URL', process.env.POSTGRES_URL],
];

const preferredDbUrl = dbUrlCandidates.find(([, value]) => isPostgresUrl(value));

if (preferredDbUrl) {
  process.env.DATABASE_URL = preferredDbUrl[1];
} else {
  const definedButInvalid = dbUrlCandidates
    .filter(([, value]) => value)
    .map(([name]) => name);

  if (definedButInvalid.length > 0) {
    throw new Error(
      `Invalid database URL protocol in ${definedButInvalid.join(
        ', ',
      )}. Use a PostgreSQL URL starting with "postgresql://" or "postgres://".`,
    );
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
});
