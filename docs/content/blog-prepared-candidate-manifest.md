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
      "title": "",
      "url": ""
    },
    "chatgpt": {
      "usedExistingTab": true,
      "continuedExistingConversation": true,
      "changedModel": false,
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
- `chromeEvidence.gemini.usedExistingTab` is true.
- `chromeEvidence.chatgpt.usedExistingTab` is true.
- `changedModel` is false for both browser workbenches.
- `validateOnly.wouldPublish` is true.
- `validateOnly.errors` is empty.
- `humanDesignQa.approved` is true.
- Covers are generated through GPT/ChatGPT or explicit human-approved editorial QA.

If any field is missing or false, skip publishing and report the exact missing reason.
