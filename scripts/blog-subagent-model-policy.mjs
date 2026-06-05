#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const DEFAULT_PRIMARY_MODEL = "gpt-5.3-codex-spark";
const DEFAULT_FALLBACK_MODEL = "gpt-5.4-mini";

const USAGE_EXHAUSTED_PATTERNS = [
  /\b429\b/i,
  /usage\s+(?:limit|quota|cap|budget).*?(?:exhaust|exceed|reached|used up)/i,
  /(?:limit|quota|cap|budget).*?(?:exhaust|exceed|reached|used up)/i,
  /resource[_\s-]*exhausted/i,
  /insufficient[_\s-]*(?:quota|credits|balance)/i,
  /rate[_\s-]*limit/i,
  /too many requests/i,
  /model.*?(?:overloaded|capacity|temporarily unavailable)/i,
  /subagent.*?(?:usage|quota|limit).*?(?:exhaust|exceed|reached|used up)/i,
  /spark.*?(?:usage|quota|limit).*?(?:exhaust|exceed|reached|used up)/i
];

export function primarySubagentModel(env = process.env) {
  return env.ALTOS_BLOG_SUBAGENT_PRIMARY_MODEL || DEFAULT_PRIMARY_MODEL;
}

export function fallbackSubagentModel(env = process.env) {
  return env.ALTOS_BLOG_SUBAGENT_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
}

export function isSubagentUsageExhausted(errorLike = "") {
  const text =
    typeof errorLike === "string"
      ? errorLike
      : [
          errorLike?.message,
          errorLike?.code,
          errorLike?.status,
          errorLike?.stderr,
          errorLike?.stdout,
          errorLike?.body,
          errorLike?.response?.status,
          errorLike?.response?.statusText
        ]
          .filter(Boolean)
          .join("\n");
  return USAGE_EXHAUSTED_PATTERNS.some((pattern) => pattern.test(text));
}

export function selectSubagentModel({ error, usageExhausted = false, env = process.env } = {}) {
  const exhausted = usageExhausted || isSubagentUsageExhausted(error);
  return {
    model: exhausted ? fallbackSubagentModel(env) : primarySubagentModel(env),
    primaryModel: primarySubagentModel(env),
    fallbackModel: fallbackSubagentModel(env),
    fallbackActive: exhausted,
    reason: exhausted ? "primary subagent usage exhausted" : "primary subagent model available"
  };
}

export function subagentModelPolicyLines(env = process.env) {
  const primary = primarySubagentModel(env);
  const fallback = fallbackSubagentModel(env);
  return [
    `Primary subagent model: ${primary}.`,
    `Fallback subagent model: ${fallback}.`,
    `If ${primary} returns usage exhausted, quota exceeded, rate limit, 429, resource_exhausted, capacity, or budget-limit errors, continue the same bounded subagent task with ${fallback}.`,
    "The fallback worker inherits the same permissions, owned files, output cap, no-publish rule and final-quality-decision ban."
  ];
}

export function subagentModelPolicyText(env = process.env) {
  return subagentModelPolicyLines(env).join("\n");
}

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const error = arg("error", "");
  const result = selectSubagentModel({ error, usageExhausted: process.argv.includes("--usage-exhausted") });
  console.log(JSON.stringify({ ok: true, ...result, policy: subagentModelPolicyLines() }, null, 2));
}
