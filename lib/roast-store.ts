// Persists a roast so it can be shared via a short URL: /roast/[id].
// Backed by Supabase (Postgres). Server-only — uses the service-role key,
// which bypasses RLS, so this file must never be imported into client code.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RepoMetadata } from "./github";
import type { RoastResult } from "./schema";

export interface StoredRoast {
  metadata: RepoMetadata;
  roast: RoastResult;
}

// Built lazily, not at module load: Next's build-time "collect page data"
// step imports every route module just to inspect it, with no env vars
// guaranteed to be present yet. Throwing here turns a missing-env-var
// problem into a hard build failure instead of a runtime one.
let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (supabase) return supabase;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  return supabase;
}

/** Generate a short, URL-safe id for a new roast. */
function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

/**
 * Save a roast and return the id it can be fetched back by.
 */
export async function saveRoast(payload: StoredRoast): Promise<string> {
  const id = generateId();

  const { error } = await getClient()
    .from("roasts")
    .insert({ id, metadata: payload.metadata, roast: payload.roast });

  if (error) {
    throw new Error(`Failed to save roast: ${error.message}`);
  }

  return id;
}

/**
 * Look up a roast by id. Returns null if it doesn't exist (never rejects
 * for a missing row — that's the caller's cue to render a 404).
 */
export async function getRoast(id: string): Promise<StoredRoast | null> {
  const { data, error } = await getClient()
    .from("roasts")
    .select("metadata, roast")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch roast ${id}: ${error.message}`);
  }

  return data ?? null;
}
