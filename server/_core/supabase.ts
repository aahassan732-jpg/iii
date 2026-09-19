import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";
import type { Request } from "express";
import { getUserByOpenId, upsertUser } from "../db";
import type { User } from "../../drizzle/schema";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

function bearerToken(req: Request) {
  const value = req.headers.authorization;
  return value?.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : "";
}

function displayName(user: SupabaseUser) {
  const metadata = user.user_metadata ?? {};
  return String(metadata.full_name ?? metadata.name ?? user.email ?? "").trim() || null;
}

export async function authenticateSupabaseRequest(req: Request): Promise<User | null> {
  const token = bearerToken(req);
  if (!supabase || !token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  const authUser = data.user;
  const openId = authUser.id;
  await upsertUser({
    openId,
    name: displayName(authUser),
    email: authUser.email ?? null,
    loginMethod: String(authUser.app_metadata?.provider ?? "supabase"),
    lastSignedIn: new Date(),
  });
  const user = await getUserByOpenId(openId);
  if (!user || user.disabled) return null;
  return user;
}
