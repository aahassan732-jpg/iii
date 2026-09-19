export type InstagramProfile = {
  username: string;
  userId?: string | null;
  displayName?: string | null;
  biography?: string | null;
  followers?: number | null;
  following?: number | null;
  postCount?: number | null;
  verified?: boolean | null;
  isPrivate?: boolean | null;
  profilePictureUrl?: string | null;
  externalUrl?: string | null;
  fetchedAt: Date;
  source: string;
};

export type InstagramProviderResult = { profile: InstagramProfile };

export interface InstagramProvider {
  readonly name: string;
  fetchProfile(username: string): Promise<InstagramProviderResult>;
  health(): { name: string; status: "ready" | "not_configured"; responseMs: number | null; checkedAt: string };
}

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 30);
}

export function mapWorkerProfile(payload: unknown, username: string, source: string): InstagramProfile {
  const body = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const data = (body.profile && typeof body.profile === "object" ? body.profile : body) as Record<string, unknown>;
  const numberValue = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
  const booleanValue = (value: unknown): boolean | null => typeof value === "boolean" ? value : null;
  const stringValue = (value: unknown): string | null => typeof value === "string" && value.length > 0 ? value : null;
  return {
    username: normalizeUsername(String(data.username ?? username)),
    userId: stringValue(data.userId ?? data.userid ?? data.id),
    displayName: stringValue(data.displayName ?? data.full_name ?? data.fullName),
    biography: stringValue(data.biography ?? data.bio),
    followers: numberValue(data.followers ?? data.followersCount),
    following: numberValue(data.following ?? data.followingCount),
    postCount: numberValue(data.postCount ?? data.posts_count ?? data.postsCount),
    verified: booleanValue(data.verified),
    isPrivate: booleanValue(data.isPrivate ?? data.private),
    profilePictureUrl: stringValue(data.profilePictureUrl ?? data.profile_picture ?? data.profilePicUrl),
    externalUrl: stringValue(data.externalUrl ?? data.external_url),
    fetchedAt: new Date(),
    source,
  };
}

export class InstaloaderProvider implements InstagramProvider {
  readonly name = "instaloader";
  private readonly workerUrl = process.env.INSTAGRAM_WORKER_URL?.replace(/\/$/, "");

  async fetchProfile(username: string): Promise<InstagramProviderResult> {
    if (!this.workerUrl) throw new Error("مصدر Instagram غير مهيأ: أضف INSTAGRAM_WORKER_URL");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(`${this.workerUrl}/profile`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: normalizeUsername(username) }),
        signal: controller.signal,
      });
      const text = await response.text();
      let payload: unknown = {};
      try { payload = text ? JSON.parse(text) : {}; } catch { /* handled below */ }
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload ? String((payload as { error: unknown }).error) : `Instagram worker returned ${response.status}`;
        throw new Error(message);
      }
      return { profile: mapWorkerProfile(payload, username, this.name) };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("لم يستجب مصدر Instagram خلال 10 ثوانٍ. حاول لاحقًا.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  health() { return { name: this.name, status: this.workerUrl ? "ready" as const : "not_configured" as const, responseMs: null, checkedAt: new Date().toISOString() }; }
}

export class MockProvider implements InstagramProvider {
  readonly name = "mock";
  async fetchProfile(username: string): Promise<InstagramProviderResult> {
    const normalized = normalizeUsername(username);
    return { profile: { username: normalized, displayName: normalized, biography: "Mock profile (development only)", followers: 0, following: 0, postCount: 0, verified: false, isPrivate: false, profilePictureUrl: null, externalUrl: null, userId: null, fetchedAt: new Date(), source: this.name } };
  }
  health() { return { name: this.name, status: "ready" as const, responseMs: 0, checkedAt: new Date().toISOString() }; }
}
