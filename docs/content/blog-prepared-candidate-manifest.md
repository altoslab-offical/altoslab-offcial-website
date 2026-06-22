# ALTOS LAB Blog Prepared Candidate Manifest

Every scheduled publish must use a prepared candidate. Release-time jobs must never generate fresh content.

## File Location

Write the manifest into the run folder:

```txt
data/blog-worker-runs/<date>-<slot>-<topic>/prepared-candidate.json
```

## Required Fields

```json
{
  "status": "ready",
  "slot": "morning",
  "expectedReleaseAt": "2026-05-31T09:00:00+08:00",
  "articleSetPath": "data/blog-worker-runs/.../article-set.json",
  "coverFiles": ["data/blog-worker-runs/.../covers/cover.png"],
  "chromeEvidence": {
    "gemini": {
      "usedExistingTab": true,
      "continuedExistingConversation": true,
      "changedModel": false,
      "profileEmail": "john.wu0120@gmail.com",
      "title": "",
      "url": ""
    },
    "chatgpt": {
      "usedExistingTab": true,
      "continuedExistingConversation": true,
      "changedModel": false,
      "profileEmail": "john.wu0120@gmail.com",
      "title": "",
      "url": ""
    }
  },
  "validateOnly": {
    "wouldPublish": true,
    "qualityApproved": true,
    "qualityScore": 0,
    "imageApproved": true,
    "imageScore": 0,
    "errors": [],
    "warnings": []
  },
  "humanDesignQa": {
    "approved": true,
    "reviewedBy": "main-brain",
    "notes": ""
  }
}
```

## Release Gate

Publish only when all are true:

- `status` is `ready`.
- `slot` matches the current release slot.
- `expectedReleaseAt` is the current release window.
- For columns/features, `chromeEvidence.gemini.usedExistingTab` is true because Gemini produced the approved source article.
- For columns/features with generated covers or content images, `chromeEvidence.chatgpt.usedExistingTab` is true.
- For any browser workbench used in the candidate, `profileEmail` is `john.wu0120@gmail.com`; candidates from `tm.studio` or an unknown Chrome profile are held.
- For market-news sets where every post is `breaking` and `generation.provider` is `source-translation`, Gemini and ChatGPT evidence are not required; the hard gate is source fidelity, all-language localization, and accepted shared cover metadata. Source/official image is preferred. Approved ALTOS LAB editorial fallback cover is allowed only with credit/license, `imageQualityStatus=passed`, and rendered topic-fit evidence.
- `changedModel` is false for any browser workbench used in that lane.
- `validateOnly.wouldPublish` is true.
- `validateOnly.errors` is empty.
- `humanDesignQa.approved` is true.
- Column/feature covers and content images are generated through GPT/ChatGPT or explicit human-approved editorial QA.
- Market-news covers are credited source article or official announcement images, or approved ALTOS LAB editorial fallback covers when source imagery fails QA. Never substitute stock/free images, local placeholders, or unreviewed GPT art.

If any field is missing or false, skip publishing and report the exact missing reason.
