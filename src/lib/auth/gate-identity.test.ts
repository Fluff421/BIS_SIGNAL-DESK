import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GATE_IDENTITY_HEADER,
  gateIdentityEnabled,
  sessionBoundToGateIdentity,
} from "./gate-identity.server";

describe("gate-identity", () => {
  it("exports the identity header name", () => {
    assert.equal(GATE_IDENTITY_HEADER, "x-grok-identity");
  });

  it("gateIdentityEnabled is false without GROK_PROJECT_ID", () => {
    const prev = process.env.GROK_PROJECT_ID;
    delete process.env.GROK_PROJECT_ID;
    process.env.VITE_AUTH_ENABLED = "true";
    assert.equal(gateIdentityEnabled(), false);
    if (prev !== undefined) process.env.GROK_PROJECT_ID = prev;
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
});
