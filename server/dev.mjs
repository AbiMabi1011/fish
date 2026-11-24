/**
 * Development runner: starts both the backend server and the Vite frontend together.
 */
import "./load-env.mjs";
import { spawn } from "node:child_process";

const backend = spawn(process.execPath, ["server/index.mjs"], {
  stdio: "inherit",
});
const frontend = spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
  stdio: "inherit",
});

const children = [backend, frontend];
let stopping = false;

function stop(exitCode) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    child.kill();
  }
  process.exitCode = exitCode || 0;
}

for (const child of children) {
  child.on("error", () => stop(1));
  child.on("exit", stop);
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
