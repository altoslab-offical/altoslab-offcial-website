#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";

const SCOPE = "https://www.googleapis.com/auth/gmail.send";
const DEFAULT_PORT = 8799;

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function openUrl(url) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.unref();
}

async function exchangeCodeForToken({ code, clientId, clientSecret, redirectUri }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || `Token exchange failed with ${response.status}`);
  }
  if (!payload.refresh_token) {
    throw new Error("Google did not return refresh_token. Re-run with a new consent prompt or revoke the old grant first.");
  }
  return payload;
}

function usage() {
  console.log(`ALTOS LAB Gmail refresh-token helper

Required env:
  GMAIL_CLIENT_ID
  GMAIL_CLIENT_SECRET

Optional env:
  GMAIL_REDIRECT_PORT=${DEFAULT_PORT}

Example:
  GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... npm run gmail:token
`);
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;
const port = Number(process.env.GMAIL_REDIRECT_PORT || DEFAULT_PORT);

if (!clientId || !clientSecret) {
  usage();
  process.exitCode = 1;
  process.exit();
}

const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", redirectUri);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", redirectUri);
    if (url.pathname !== "/oauth2callback") {
      response.writeHead(404).end("Not found");
      return;
    }

    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    if (error) throw new Error(error);
    if (!code) throw new Error("Missing authorization code");

    const token = await exchangeCodeForToken({ code, clientId, clientSecret, redirectUri });
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Gmail authorization complete. You can return to Codex.");

    console.log("\nGmail refresh token created. Add these values to local env and production secrets:\n");
    console.log(`GMAIL_CLIENT_ID=${clientId}`);
    console.log("GMAIL_CLIENT_SECRET=<keep your existing client secret>");
    console.log(`GMAIL_REFRESH_TOKEN=${token.refresh_token}`);
    console.log("CONTACT_NOTIFY_FROM=altoslab.offical@gmail.com");
    console.log("CONTACT_NOTIFY_TO=altoslab.offical@gmail.com\n");
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "OAuth failed");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Opening Google OAuth consent for Gmail send scope:\n${authUrl.toString()}\n`);
  openUrl(authUrl.toString());
});
