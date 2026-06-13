const PUBLIC_EXCERPT_PREFIX_PATTERN =
  /^\s*(?:TL\s*;?\s*DR|TLDR)\s*(?:[（(][^）)]{0,80}[）)]|\s+from\s+[^:：]{1,80})?\s*[:：]\s*/i;

export function stripPublicExcerptPrefix(value: string | null | undefined) {
  let text = String(value ?? "").trim();
  let previous = "";
  while (text && text !== previous) {
    previous = text;
    text = text.replace(PUBLIC_EXCERPT_PREFIX_PATTERN, "").trimStart();
  }
  return text.trim();
}
