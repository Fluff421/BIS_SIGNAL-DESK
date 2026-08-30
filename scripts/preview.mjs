#!/usr/bin/env node
/** Preview server control (start/stop/restart). */
const cmd = process.argv[2] ?? "help";
console.log("[preview]", cmd, "— use npm run preview for full Vite preview");
