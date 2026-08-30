import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GATE_IDENTITY_HEADER,
  GATE_JWKS_PATH,
  gateIdentityEnabled,
  resolveGateEndpoints,
  sessionBoundToGateIdentity,
  verifyGateIdentityToken,
} from "./gate-identity.server";

describe("gate-identity", () => {
  it("exports header and jwks path constants", () => {
    assert.equal(GATE_IDENTITY_HEADER, "x-grok-identity");
    assert.equal(GATE_JWKS_PATH, "/__gate/identity-key");
  });

  it("gateIdentityEnabled requires project id and auth on", () => {
    const prevPid = process.env.GROK_PROJECT_ID;
    const prevAuth = process.env.VITE_AUTH_ENABLED;
    delete process.env.GROK_PROJECT_ID;
    process.env.VITE_AUTH_ENABLED = "true";
    assert.equal(gateIdentityEnabled(), false);
    process.env.GROK_PROJECT_ID = "proj-1";
    assert.equal(gateIdentityEnabled(), true);
    process.env.VITE_AUTH_ENABLED = "false";
    assert.equal(gateIdentityEnabled(), false);
    if (prevPid !== undefined) process.env.GROK_PROJECT_ID = prevPid;
    else delete process.env.GROK_PROJECT_ID;
    if (prevAuth !== undefined) process.env.VITE_AUTH_ENABLED = prevAuth;
    else delete process.env.VITE_AUTH_ENABLED;
  });

  it("sessionBoundToGateIdentity matches provider + sub", () => {
    assert.equal(
      sessionBoundToGateIdentity(
        [{ providerId: "grok-gate", accountId: "user-1" }],
        "user-1",
        "grok-gate",
      ),
      true,
    );
    assert.equal(
      sessionBoundToGateIdentity(
        [{ providerId: "grok-google", accountId: "user-1" }],
        "user-1",
        "grok-gate",
      ),
      false,
    );
  });

  it("resolveGateEndpoints maps grok.me hosts", () => {
    const h = new Headers({ host: "demo.grok.me" });
    const ep = resolveGateEndpoints(h);
    assert.ok(ep);
    assert.equal(ep!.issuer, "https://gate.grok.me");
    assert.ok(ep!.jwksUrl.includes(GATE_JWKS_PATH));
  });

  it("verifyGateIdentityToken returns null on garbage", async () => {
    const result = await verifyGateIdentityToken("not-a-jwt", {
      issuer: "https://gate.grok.me",
      audience: "app:x",
      getKey: async () => {
        throw new Error("no key");
      },
    });
    assert.equal(result, null);
  });
});
