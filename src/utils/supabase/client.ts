import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/env/supabase';

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabasePublishableKey();

export const createClient = () => createBrowserClient(supabaseUrl!, supabaseKey!);
