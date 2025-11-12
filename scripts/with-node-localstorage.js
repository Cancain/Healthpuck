#!/usr/bin/env node

/**
 * Ensures Node-based tooling that touches the Web Storage API
 * has access to a safe shim instead of throwing the built-in
 * `SecurityError` raised by the experimental Node implementation.
 */

const { spawn } = require("child_process");
const path = require("path");

const [, , ...rawArgs] = process.argv;

const envAssignments = {};
let commandIndex = 0;

for (; commandIndex < rawArgs.length; commandIndex += 1) {
  const token = rawArgs[commandIndex];
  if (!token || token.startsWith("-") || !token.includes("=")) {
    break;
  }
  const [key, value] = token.split("=", 2);
  if (!key) {
    console.error(`Invalid environment assignment: "${token}"`);
    process.exit(1);
  }
  envAssignments[key] = value ?? "";
}

const args = rawArgs.slice(commandIndex);

if (args.length === 0) {
  console.error("Usage: with-node-localstorage [KEY=value ...] <command> [...args]");
  process.exit(1);
}

const shimPath = path.resolve(__dirname, "setup-webstorage-shim.js");
const shimOption = `--require ${JSON.stringify(shimPath)}`;

const env = { ...process.env, ...envAssignments };
env.NODE_OPTIONS = env.NODE_OPTIONS ? `${shimOption} ${env.NODE_OPTIONS}` : shimOption;

const child = spawn(args[0], args.slice(1), {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
