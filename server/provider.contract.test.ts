import { describe, expect, it } from "vitest";
import { normalizeUsername } from "../providers/instagram/InstagramProvider";

describe("Instagram provider contract", () => {
  it("normalizes public usernames without @", () => { expect(normalizeUsername("@@Public.Name")).toBe("public.name"); });
  it("does not allow arbitrary characters", () => { expect(normalizeUsername("<script>alert(1)</script>")).toBe("scriptalert1script"); });
});
