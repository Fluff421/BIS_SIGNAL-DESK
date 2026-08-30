#!/usr/bin/env node
/** Preview server control (start/stop/restart). */
export function parsePreviewArgs(argv) {
  const cmd = argv[0] ?? "help";
  return { cmd, rest: argv.slice(1) };
}

export function parsePid(text) {
  const n = Number(String(text).trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function stopOutcome({ signalled, stubborn, after }) {
  return { signalled: signalled ?? [], stubborn: stubborn ?? [], after: after ?? [] };
}

const { cmd } = parsePreviewArgs(process.argv.slice(2));
console.log(JSON.stringify({ ok: true, cmd, note: "use npm run preview for full Vite preview" }));
