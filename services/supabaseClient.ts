import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants';

const isValidUrl = (url: string) => {
  try {
    return Boolean(url && new URL(url));
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = isValidUrl(SUPABASE_CONFIG.URL) && Boolean(SUPABASE_CONFIG.KEY);

const createSafeClient = () => {
    // Only attempt to create the real client if we have a valid URL and Key
    if (isSupabaseConfigured) {
        return createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
    }
    
    console.warn("Supabase credentials missing or invalid. Using mock client to prevent crash.");
    
    // Create a mock builder that can handle the chain calls used in the app
    // e.g. .from().select().eq().maybeSingle()
    const mockBuilder = {
        select: () => mockBuilder,
        eq: () => mockBuilder,
        order: () => mockBuilder,
        limit: () => mockBuilder,
        single: async () => ({ data: null, error: { message: "Supabase not configured" } }),
        maybeSingle: async () => ({ data: null, error: null }), // Return null data gracefully
        upsert: async () => ({ error: null }),
        update: () => mockBuilder,
        // If awaited directly as a promise (e.g. for .select()), return empty list
        then: (resolve: (val: any) => void) => resolve({ data: [], error: null })
    };

    return {
        from: () => mockBuilder
    } as unknown as SupabaseClient;
};

export const supabase = createSafeClient();