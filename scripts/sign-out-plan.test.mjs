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

const TEST_TIMEOUT_MS = 20;
const hangs = () => new Promise(() => {});
const rejects = () => Promise.reject(new Error("network down"));
const flush = () => new Promise((resolve) => setImmediate(resolve));

function harness(overrides = {}) {
  const order = [];
  let requests = 0;
  const steps = {
    livePreview: false,
    hasBearer: true,
    requestSignOut: () => {
      requests += 1;
      return Promise.resolve();
    },
    clearToken: () => order.push("clear"),
    redirect: () => order.push("redirect"),
    timeoutMs: TEST_TIMEOUT_MS,
    ...overrides,
  };
  return {
    order,
    get requests() {
      return requests;
    },
    run: () => runSignOut(steps),
  };
}

const preview = (overrides = {}) => harness({ livePreview: true, ...overrides });
const deployed = (overrides = {}) => harness({ livePreview: false, ...overrides });

test("preview: a successful sign-out clears the token, then redirects", async () => {
  const h = preview();
  await h.run();
  assert.equal(h.requests, 1);
  assert.deepEqual(h.order, ["clear", "redirect"]);
});

test("preview: a rejected sign-out still clears the token and redirects", async () => {
  const h = preview({ requestSignOut: rejects });
  await h.run();
  assert.deepEqual(h.order, ["clear", "redirect"]);
});

test("preview: a sign-out that throws synchronously still clears and redirects", async () => {
  const h = preview({
    requestSignOut: () => {
      throw new Error("no fetch");
    },
  });
  await h.run();
  assert.deepEqual(h.order, ["clear", "redirect"]);
});

test("preview: a sign-out that never settles clears and redirects after the bound", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = preview({ requestSignOut: hangs });
  const done = h.run();
  t.mock.timers.tick(TEST_TIMEOUT_MS);
  await done;
  assert.deepEqual(h.order, ["clear", "redirect"]);
});

test("preview: without a bearer there is nothing to invalidate", async () => {
  const h = preview({ hasBearer: false });
  await h.run();
  assert.equal(h.requests, 0);
  assert.deepEqual(h.order, ["clear", "redirect"]);
});

test("deployed: success clears and redirects", async () => {
  const h = deployed();
  await h.run();
  assert.deepEqual(h.order, ["clear", "redirect"]);
});

test("deployed: a failed sign-out throws and does not redirect", async () => {
  const h = deployed({ requestSignOut: rejects });
  await assert.rejects(() => h.run(), /Sign-out failed/);
  assert.deepEqual(h.order, []);
});

test("deployed: a timed-out sign-out throws and does not redirect", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = deployed({ requestSignOut: hangs });
  const done = h.run();
  t.mock.timers.tick(TEST_TIMEOUT_MS);
  await assert.rejects(() => done, /timed out/);
  assert.deepEqual(h.order, []);
});

test("settleWithin reports ok / failed / timeout", async () => {
  assert.equal(await settleWithin(() => Promise.resolve(), 50), "ok");
  assert.equal(await settleWithin(rejects, 50), "failed");
  assert.equal(await settleWithin(hangs, 20), "timeout");
});

function preSignIn(livePreview, overrides = {}) {
  let cleared = 0;
  const done = runPreSignInSignOut({
    livePreview,
    hasBearer: true,
    requestSignOut: hangs,
    clearToken: () => {
      cleared += 1;
    },
    ...overrides,
  });
  return {
    done,
    get cleared() {
      return cleared;
    },
  };
}

test("pre-sign-in: the preview clear gives up at the preview bound", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = preSignIn(true);
  t.mock.timers.tick(PREVIEW_SIGN_OUT_TIMEOUT_MS - 1);
  await flush();
  assert.equal(h.cleared, 0);
  t.mock.timers.tick(1);
  await h.done;
  assert.equal(h.cleared, 1);
});

test("pre-sign-in: a deployed session gets the deployed window", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = preSignIn(false);
  t.mock.timers.tick(PREVIEW_SIGN_OUT_TIMEOUT_MS);
  await flush();
  assert.equal(h.cleared, 0);
  t.mock.timers.tick(DEPLOYED_SIGN_OUT_TIMEOUT_MS - PREVIEW_SIGN_OUT_TIMEOUT_MS);
  await h.done;
  assert.equal(h.cleared, 1);
});

test("pre-sign-in: a failed clear never blocks sign-in", async () => {
  await preSignIn(false, { requestSignOut: rejects, timeoutMs: TEST_TIMEOUT_MS }).done;
  await preSignIn(true, { requestSignOut: rejects, timeoutMs: TEST_TIMEOUT_MS }).done;
});

test("pre-sign-in: the preview skips the request when there is no bearer", async () => {
  let requests = 0;
  const h = preSignIn(true, {
    hasBearer: false,
    requestSignOut: () => {
      requests += 1;
      return hangs();
    },
  });
  await h.done;
  assert.equal(requests, 0);
  assert.equal(h.cleared, 1);
});

test("every sign-out bound comes from one rule", () => {
  assert.equal(signOutTimeoutMs(true), PREVIEW_SIGN_OUT_TIMEOUT_MS);
  assert.equal(signOutTimeoutMs(false), DEPLOYED_SIGN_OUT_TIMEOUT_MS);
});

test("the defaults are bounded, and deployed waits longer than preview", async (t) => {
  assert.ok(PREVIEW_SIGN_OUT_TIMEOUT_MS > 0 && PREVIEW_SIGN_OUT_TIMEOUT_MS <= 2000);
  assert.ok(DEPLOYED_SIGN_OUT_TIMEOUT_MS > PREVIEW_SIGN_OUT_TIMEOUT_MS);
  assert.ok(DEPLOYED_SIGN_OUT_TIMEOUT_MS <= 30_000);
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = preview({ requestSignOut: hangs, timeoutMs: undefined });
  const done = h.run();
  t.mock.timers.tick(PREVIEW_SIGN_OUT_TIMEOUT_MS);
  await done;
  assert.deepEqual(h.order, ["clear", "redirect"]);
});
