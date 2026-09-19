import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";

type UseAuthOptions = { redirectOnUnauthenticated?: boolean; redirectPath?: string };

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionUser, setSessionUser] = useState<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>(null);
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false, enabled: sessionReady && Boolean(sessionUser) });

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSessionUser(data.session?.user ?? null);
      setSessionReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSessionUser(nextSession?.user ?? null);
      setSessionReady(true);
      void utils.auth.me.invalidate();
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [utils]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
    utils.auth.me.setData(undefined, null);
    await utils.auth.me.invalidate();
  }, [utils]);

  const user = meQuery.data ?? null;
  const loading = !sessionReady || (Boolean(sessionUser) && meQuery.isLoading);
  const state = useMemo(() => ({ user, loading, error: meQuery.error ?? null, isAuthenticated: Boolean(user) }), [user, loading, meQuery.error]);

  useEffect(() => {
    if (!redirectOnUnauthenticated || loading || state.user) return;
    if (typeof window === "undefined") return;
    window.location.href = redirectPath || "/login";
  }, [redirectOnUnauthenticated, loading, redirectPath, state.user]);

  return { ...state, refresh: () => meQuery.refetch(), logout };
}
