"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { sendAnalyticsEvent } from "@/components/AnalyticsEvents";

type ContactFormLabels = {
  who?: string;
  contact?: string;
  message?: string;
  submit?: string;
};

export function ContactForm({ labels = {} }: { labels?: ContactFormLabels }) {
  const formRef = useRef<HTMLFormElement>(null);
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
    setMessage("需求已送出，我們已收到你的合作需求，會盡快透過你留下的聯絡方式回覆。");
    formRef.current?.reset();
    sendAnalyticsEvent({ event: "lead_created", page_path: window.location.pathname });
  }

  return (
    <form ref={formRef} action={submit} className="contact-form">
      <label>
        <span>{labels.who || "公司 / 團隊 / 姓名"}</span>
        <input name="who" required placeholder="公司 / 團隊 / 你的名字" />
      </label>
      <label>
        <span>{labels.contact || "Email / LINE / 電話"}</span>
        <input name="contact" required placeholder="Email、LINE、電話或其他方便聯絡的方式" />
      </label>
      <label>
        <span>{labels.message || "想導入 AI 的場景"}</span>
        <textarea name="message" required rows={5} placeholder="簡單說明想導入 AI、系統整合、自動化流程，或目前遇到的問題。" />
      </label>
      <button className="button primary" type="submit" disabled={status === "sending"}>
        <Send size={16} />
        {status === "sending" ? "送出中" : labels.submit || "送出需求"}
      </button>
      {message ? (
        <div className={`form-message ${status}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
          {status === "sent" ? <strong>已送出</strong> : null}
          <span>{message}</span>
        </div>
      ) : null}
    </form>
  );
}
