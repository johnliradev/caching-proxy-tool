#!/usr/bin/env node
import { spawn } from "node:child_process";

const [, , cmd, ...args] = process.argv;

// Help command npx caching-proxy -h
if (cmd === "-h" || cmd === "--help" || cmd === "-H") {
  console.log("Usage: caching-proxy start --port <port> --origin <origin-url>");
  console.log("Options:");
  console.log("  --port    The port number for the proxy server to listen on.");
  console.log("  --origin  The origin URL the proxy forwards requests to.");
  process.exit(0);
}

function parseArgs(args) {
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    // Suports --port=3000 or --port 3000
    if (arg.startsWith("--port=")) {
      parsed.port = arg.split("=")[1];
    } else if (arg === "--port" && args[i + 1]) {
      parsed.port = args[i + 1];
      i++;
    }

    if (arg.startsWith("--origin=")) {
      parsed.origin = arg.split("=")[1];
    } else if (arg === "--origin" && args[i + 1]) {
      parsed.origin = args[i + 1];
      i++;
    }
  }
  return parsed;
}

// Validate args
function validateArgs(parsed) {
  if (!parsed.port) {
    console.error("Error: --port is required");
    return false;
  }
  if (!parsed.origin) {
    console.error("Error: --origin is required");
    return false;
  }
  // Valid if port is a number
  const portNum = parseInt(parsed.port, 10);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    console.error("Error: --port must be a valid number between 1 and 65535");
    return false;
  }

  // valid if URL origin is valid
  try {
    new URL(parsed.origin);
  } catch {
    console.error("Error: --origin must be a valid URL");
    return false;
  }

  return true;
}

// Main
if (cmd === "start") {
  const parsed = parseArgs(args);

  if (!validateArgs(parsed)) {
    console.error("Use --help or -h for usage information.");
    process.exit(1);
  }

  console.log("Caching proxy start");
  // Pass args with process env
  spawn("node", ["src/main.js", parsed.port, parsed.origin], {
    stdio: "inherit",
    env: { ...process.env, PORT: parsed.port, ORIGIN: parsed.origin },
  });
} else {
  console.error("Command not found");
  console.error("use -H argument to see help.");
  process.exit(1);
}
