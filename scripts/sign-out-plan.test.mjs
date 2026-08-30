import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEPLOYED_SIGN_OUT_TIMEOUT_MS,
  PREVIEW_SIGN_OUT_TIMEOUT_MS,
  runPreSignInSignOut,
  runSignOut,
  settleWithin,
  signOutTimeoutMs,
} from "./sign-out-plan.mjs";

const hangs = () => new Promise(() => {});
const rejects = () => Promise.reject(new Error("network down"));

test("preview timeout is aggressive; deployed is generous", () => {
  assert.equal(signOutTimeoutMs(true), PREVIEW_SIGN_OUT_TIMEOUT_MS);
  assert.equal(signOutTimeoutMs(false), DEPLOYED_SIGN_OUT_TIMEOUT_MS);
  assert.ok(PREVIEW_SIGN_OUT_TIMEOUT_MS < DEPLOYED_SIGN_OUT_TIMEOUT_MS);
});

test("settleWithin reports ok / failed / timeout", async () => {
  assert.equal(await settleWithin(() => Promise.resolve(), 50), "ok");
  assert.equal(await settleWithin(rejects, 50), "failed");
  assert.equal(await settleWithin(hangs, 20), "timeout");
});

test("runSignOut in preview always clears and redirects", async () => {
  let cleared = false;
  let redirected = false;
  await runSignOut({
    livePreview: true,
    hasBearer: true,
    requestSignOut: hangs,
    clearToken: () => {
      cleared = true;
    },
    redirect: () => {
      redirected = true;
    },
    timeoutMs: 20,
  });
  assert.equal(cleared, true);
  assert.equal(redirected, true);
});

test("runSignOut deployed throws on timeout", async () => {
  await assert.rejects(
    () =>
      runSignOut({
        livePreview: false,
        hasBearer: false,
        requestSignOut: hangs,
        clearToken: () => {},
        redirect: () => {},
        timeoutMs: 20,
      }),
    /timed out/,
  );
});

test("runPreSignInSignOut never throws", async () => {
  await runPreSignInSignOut({
    livePreview: true,
    hasBearer: true,
    requestSignOut: rejects,
    clearToken: () => {},
    timeoutMs: 20,
  });
});
