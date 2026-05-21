"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setStatus("sending");
    setMessage("");

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        who: formData.get("who"),
        contact: formData.get("contact"),
        message: formData.get("message")
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus("error");
      setMessage(payload.error || "送出失敗，請稍後再試。");
      return;
    }

    setStatus("sent");
    setMessage("已收到需求，我們會盡快回覆。");
  }

  return (
    <form action={submit} className="contact-form">
      <label>
        <span>公司 / 團隊 / 姓名</span>
        <input name="who" required placeholder="Acme Co. / 王小明" />
      </label>
      <label>
        <span>Email / LINE / 電話</span>
        <input name="contact" required placeholder="hello@example.com" />
      </label>
      <label>
        <span>想導入 AI 的場景</span>
        <textarea name="message" required rows={5} placeholder="例如：AI 客服、內部知識庫、流程自動化、GEO 內容系統..." />
      </label>
      <button className="button primary" type="submit" disabled={status === "sending"}>
        <Send size={16} />
        {status === "sending" ? "送出中" : "送出需求"}
      </button>
      {message ? <p className={`form-message ${status}`}>{message}</p> : null}
    </form>
  );
}
