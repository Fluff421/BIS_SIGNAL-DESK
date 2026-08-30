import assert from "node:assert/strict";
import { test } from "node:test";
import {
  authInvariantWarnings,
  buildAuthEnabled,
  compareAuthInvariant,
  probeDevAuthEnabled,
} from "./check-auth-invariant.mjs";
import { projectRoot } from "./with-app-env.mjs";

test("agreement is ok", () => {
  assert.equal(
    compareAuthInvariant({ devAuthEnabled: false, buildAuthEnabled: false }).status,
    "ok",
  );
});

test("disagreement is diverged", () => {
  const devOn = compareAuthInvariant({ devAuthEnabled: true, buildAuthEnabled: false });
  assert.equal(devOn.status, "diverged");
  assert.match(devOn.message, /dev server has sign-in on but the next build has it off/);
});

test("an unobservable dev server is indeterminate", () => {
  assert.equal(
    compareAuthInvariant({ devAuthEnabled: null, buildAuthEnabled: false }).status,
    "indeterminate",
  );
});

test("a dev server that cannot be reached probes as null", async () => {
  const unreachable = () => Promise.reject(new Error("ECONNREFUSED"));
  assert.equal(await probeDevAuthEnabled("http://127.0.0.1:1", unreachable), null);
});

test("a server without the endpoint probes as null", async () => {
  const notFound = async () => ({ ok: false, text: async () => "Not Found" });
  assert.equal(await probeDevAuthEnabled("http://127.0.0.1:8081", notFound), null);
});

test("only a divergence warns the smoke verdict", () => {
  const diverged = compareAuthInvariant({ devAuthEnabled: true, buildAuthEnabled: false });
  assert.deepEqual(authInvariantWarnings(diverged), [diverged.message]);
  assert.deepEqual(
    authInvariantWarnings(
      compareAuthInvariant({ devAuthEnabled: false, buildAuthEnabled: false }),
    ),
    [],
  );
});

test("the build side resolves the template's shipped app-env", () => {
  assert.equal(buildAuthEnabled(projectRoot(), {}), false);
  assert.equal(buildAuthEnabled(projectRoot(), { VITE_AUTH_ENABLED: "true" }), true);
});
