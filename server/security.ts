import crypto from "node:crypto";

export function hashSecret(value: string): string { return crypto.createHash("sha256").update(value).digest("hex"); }
export function createActivationCode(): string { const raw = crypto.randomBytes(12).toString("hex").toUpperCase().slice(0, 16); return `ILP-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`; }
export function createApiKey(): string { return `ilk_${crypto.randomBytes(24).toString("hex")}`; }
export function safeEqualHash(value: string, expectedHash: string): boolean { return crypto.timingSafeEqual(Buffer.from(hashSecret(value)), Buffer.from(expectedHash)); }
export function normalizeUsername(value: string): string { return value.trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 30); }
