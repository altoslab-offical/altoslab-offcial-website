"use client";

import type { FormEvent } from "react";
import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(payload.error || "登入失敗");
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.href = next || "/admin";
  }

  return (
    <main className="login-page">
      <form className="login-card admin-form" onSubmit={login}>
        <div className="brand">
          <span className="brand-mark">A</span>
          <span>ALTOS LAB Admin</span>
        </div>
        <h1>管理後台登入</h1>
        <p className="muted">本機開發預設密碼為 altoslab-admin；正式環境請設定 ADMIN_PASSWORD。</p>
        <label>
          <span>Password</span>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? "登入中" : "Login"}
        </button>
        {error ? <p className="form-message error">{error}</p> : null}
      </form>
    </main>
  );
}
