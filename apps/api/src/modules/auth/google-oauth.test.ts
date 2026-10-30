import { describe, expect, it } from "vitest";
import { hashSessionToken, matchesOAuthState, readGoogleIdentity } from "./google-oauth.js";

describe("Google OAuth helpers", () => {
  it("matches only the exact OAuth state", () => {
    expect(matchesOAuthState("state-value", "state-value")).toBe(true);
    expect(matchesOAuthState("state-value", "state-other")).toBe(false);
    expect(matchesOAuthState(undefined, "state-value")).toBe(false);
  });

  it("accepts only verified Google email claims with the expected nonce", () => {
    expect(readGoogleIdentity({ sub: "google-id", email: "Person@Example.com", email_verified: true, name: "Person", nonce: "n1" }, "n1"))
      .toEqual({ googleSub: "google-id", email: "person@example.com", name: "Person", avatarUrl: null });
    expect(readGoogleIdentity({ sub: "google-id", email: "person@example.com", email_verified: false, nonce: "n1" }, "n1")).toBeNull();
    expect(readGoogleIdentity({ sub: "google-id", email: "person@example.com", email_verified: true, nonce: "other" }, "n1")).toBeNull();
  });

  it("hashes session tokens before persistence", () => {
    expect(hashSessionToken("opaque-token")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSessionToken("opaque-token")).not.toBe("opaque-token");
  });
});
