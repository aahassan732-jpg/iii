import { describe, expect, it } from "vitest";
import { createActivationCode, hashSecret, normalizeUsername, safeEqualHash } from "./security";

describe("security primitives", () => {
  it("creates a strong formatted one-time code", () => {
    const code = createActivationCode();
    expect(code).toMatch(/^ILP-[A-F0-9]{4}(?:-[A-F0-9]{4}){3}$/);
    expect(code).not.toBe(createActivationCode());
  });
  it("hashes activation codes without exposing plaintext", () => {
    const code = createActivationCode(); const hash = hashSecret(code);
    expect(hash).toHaveLength(64); expect(hash).not.toContain(code); expect(safeEqualHash(code, hash)).toBe(true); expect(safeEqualHash(`${code}X`, hash)).toBe(false);
  });
  it("normalizes usernames safely", () => { expect(normalizeUsername("  @Some.User  ")).toBe("some.user"); expect(normalizeUsername("a b<script>")).toBe("abscript"); });
});
