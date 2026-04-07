const requiredEnv = (value: string | undefined, name: string) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const getSupabaseUrl = () =>
  requiredEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');

export const getSupabasePublishableKey = () =>
  requiredEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)',
  );

export const getDatabaseUrl = () =>
  process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? process.env.POSTGRES_URL;
