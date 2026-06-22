#!/usr/bin/env node

import crypto from "node:crypto";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function pickClient(raw) {
  const client = raw.installed || raw.web || raw;
  if (!client.client_id || !client.client_secret) {
    throw new Error("OAuth client JSON must include client_id and client_secret");
  }
  return client;
}

async function main() {
  const clientPath = arg("client");
  const outputPath = arg("output");
  const account = arg("account", "altoslab.offical@gmail.com");
  const scopes = arg("scopes", "https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/webmasters.readonly")
    .split(",")
    .map((scope) => scope.trim())
    .filter(Boolean);
  const port = Number(arg("port", "8095"));
  if (!clientPath || !outputPath) {
    throw new Error("Usage: node scripts/google-oauth-user-login.mjs --client <oauth-client.json> --output <authorized-user.json>");
  }

  const client = pickClient(JSON.parse(await fs.readFile(clientPath, "utf8")));
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  const state = crypto.randomBytes(18).toString("hex");
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", client.client_id);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("login_hint", account);

  console.log(`Open this URL in Chrome as ${account}:`);
  console.log(authUrl.toString());

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || "/", redirectUri);
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      if (url.searchParams.get("state") !== state) {
        res.writeHead(400);
        res.end("Invalid state");
        server.close();
        reject(new Error("OAuth state mismatch"));
        return;
      }
      const authCode = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.writeHead(authCode ? 200 : 400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(authCode ? "ALTOS LAB GA readback authorization complete. You can close this tab." : `OAuth failed: ${error || "missing code"}`);
      server.close();
      authCode ? resolve(authCode) : reject(new Error(error || "OAuth callback missing code"));
    });
    server.listen(port, "127.0.0.1");
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: client.client_id,
      client_secret: client.client_secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.refresh_token) {
    throw new Error(json.error_description || json.error || `OAuth token exchange failed ${response.status}`);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    `${JSON.stringify(
      {
        type: "authorized_user",
        client_id: client.client_id,
        client_secret: client.client_secret,
        refresh_token: json.refresh_token,
        account,
        scopes
      },
      null,
      2
    )}\n`,
    { mode: 0o600 }
  );
  await fs.chmod(outputPath, 0o600);
  console.log(`Wrote authorized_user credential: ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
