import { useAuth } from '@clerk/clerk-react';
import { useMemo } from 'react';
import { createScopedClient } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Hook to get an authenticated Supabase client with Clerk JWT
 * This ensures RLS policies work correctly by passing JWT on every request
 * @returns Authenticated Supabase client or null if not signed in
 */
export function useAuthenticatedSupabase(): SupabaseClient | null {
  const { getToken, isSignedIn } = useAuth();

  const client = useMemo(() => {
    if (!isSignedIn) {
      return null;
    }

    // Create client with custom fetch that gets fresh token on every request
    return createScopedClient(getToken);
  }, [isSignedIn, getToken]);

  return client;
}
