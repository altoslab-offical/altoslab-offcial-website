# ALTOS LAB Blog High-Throughput Publishing Design

Date: 2026-06-25
Status: Design approved in chat for approach B, pending implementation plan
Owner model: Hermes operates, OpenClaw researches, Codex verifies
Production truth: AWS ECS/Fargate + AWS S3 CMS at `https://altoslab-ai.cc`

## Problem Frame

ALTOS LAB official blog is currently too conservative for the business goal.
The old production logic treats `dailyPublicationTarget=5` as a sufficient
daily completion target. That is no longer correct.

The current business target is AdSense and SEO/GEO growth: the website should
grow toward at least USD 2,000/month in AdSense revenue. This needs more
qualified inventory, better publishing cadence, reliable image/link-preview
metadata, and a repair loop that turns held candidates into publishable
content instead of silently accepting low volume.

The user-approved strategy is approach B:

- no daily publication upper cap;
- at least 8 market-news posts per day;
- 3 columns per day;
- 24-hour sources first;
- if fewer than 8 qualified current items exist, fill with 72-hour evergreen
  sources that still have search or AI-market value;
- if a candidate fails quality, repair it or replace it with an equivalent
  candidate until the daily floor is met.

## Success Criteria

The system is successful when a daily closeout can prove all of the following
from fresh production evidence:

1. The official website published 3 complete 9-language column groups.
2. The 3 column groups were published in separated time windows, not clustered.
3. The official website published at least 8 complete 9-language market-news
   groups.
4. There is no artificial daily upper cap on total publication volume.
5. Every market-news item uses a source or official image, not generated
   fallback art.
6. Every held market-news candidate has a repair or replacement action.
7. The pipeline reports remaining qualified source backlog, if any.
8. Public readback verifies article pages, list pages, OG image metadata, and
   rendered images.
9. Hermes receives a learning summary that includes topic, source, gate,
   traffic, and cost signals.
10. OpenClaw receives a source-pool summary that improves the next 24-hour /
    72-hour scan.

## Non-Goals

- Do not lower quality gates to increase volume.
- Do not publish generated covers for market news.
- Do not bulk-copy or rehost third-party source images beyond the existing
  source/official cover contract.
- Do not treat validation-only, held manifests, or local files as production
  success.
- Do not redesign the blog UI in this change.

## Architecture

### 1. Source Pool Layer

OpenClaw owns source discovery. The source pool has two windows:

- `fresh24h`: recent AI, agent, cloud, product, developer, platform, policy,
  funding, and enterprise workflow news from the last 24 hours.
- `evergreen72h`: still-searchable or strategic sources from the last 72
  hours, used only when fresh24h cannot satisfy the daily market-news floor.

Each candidate gets a compact score:

- source freshness;
- topic relevance to ALTOS LAB;
- expected SEO/GEO value;
- enterprise/operator usefulness;
- source density;
- image availability and rights confidence;
- duplicate risk;
- language localization difficulty.

The source pool should not store full article bodies or third-party images.
It stores compact source packets and primary links.

### 2. Market-News Production Loop

Market news is source-first and terminal-first. The loop should be:

```text
scan source pool
-> select highest qualified candidate
-> create 9-language source-faithful brief
-> validate quality / source / image / language parity
-> if pass: publish and verify public readback
-> if fail: repair copy/image/source metadata
-> if repair still fails within bounded attempts: replace with next equivalent source
-> continue until at least 8 market-news groups are published
-> keep publishing beyond 8 while qualified sources remain
```

The repair loop is not an excuse to spin forever. It should be bounded per
candidate, then replacement-based:

- `maxRepairAttemptsPerCandidate=2`;
- if still failing, mark `replaced_after_repair_failure`;
- continue with the next source of similar score;
- daily closeout must report all held/replaced candidates.

### 3. Column Cadence

Columns remain capped at 3/day, but the timing must be separated. Proposed
Taipei windows:

- morning column: `09:10`;
- afternoon column: `14:40`;
- evening column: `20:20`.

The closeout should fail if all columns cluster into the same short window.
The implementation should allow these values to be configured by environment
or a single schedule constant, but the public health/readback report should
show the active schedule.

### 4. Publication Targets

Replace the old publication target model:

```text
dailyPublicationTarget=5
```

with a floor-and-throughput model:

```text
dailyColumnTarget=3
minimumMarketNewsPerDay=8
marketNewsNoUpperCap=true
dailyPublicationUpperCap=null
```

Daily closeout should no longer say the day is healthy because total posts are
at least 5. It should separately judge columns, market-news floor, held repair
queue, source backlog, and public readback.

### 5. Image And Link Preview Contract

Market news:

- cover must be source article image or official announcement/press image;
- generated market-news cover is a failure state;
- all 9 languages share the same final cover URL and attribution.

Columns:

- generated images are allowed only through the approved editorial visual lane;
- images need topic anchor, style family, prompt/evidence metadata, and
  rendered QA.

Cross-platform link previews:

- every published article must expose correct `og:image` and `twitter:image`;
- link-preview QA should verify that the preview image is the article cover,
  not the author avatar or stale social card;
- before Threads, IG, FB, or Medium shares an official-site link, the publisher
  must read back the public article metadata and rendered card image.

If a social platform caches an old preview, the website should not be blamed
until current public metadata is verified. The publisher should either wait for
cache refresh or use a platform-supported refresh/re-share path.

### 6. Hermes / OpenClaw Learning Loop

Hermes receives daily operational learning:

- published count by type;
- held and repaired candidates;
- title/subtitle patterns that passed;
- quality gate failures;
- source topics;
- GA/GSC/AdSense signals when available;
- estimated token/time cost.

OpenClaw receives daily source-learning:

- source domains that produced publishable items;
- source domains that produced weak or duplicate items;
- missing primary-source links;
- image availability;
- 24-hour versus 72-hour fill ratio;
- traffic-relevance signals.

Neither Hermes nor OpenClaw may learn "winning" topics from unpublished or
deleted content. Performance learning requires public readback and analytics.

## Data Flow

```text
source registry / AI Sense / The Rundown primary links / RSS/API
-> OpenClaw source pool
-> market source worker
-> article-set release candidate
-> quality gate
-> repair-or-replace loop
-> signed release to AWS S3 CMS
-> public readback
-> daily closeout
-> Hermes/OpenClaw learning packets
```

## Error Handling

Quality failure:

- attempt bounded repair;
- if still failing, replace candidate;
- keep failure evidence.

No enough 24-hour sources:

- fill from 72-hour evergreen source pool;
- report fill ratio.

Source image failure:

- repair source/official image;
- if unavailable, replace source;
- do not generate market-news fallback cover.

Publish/readback failure:

- retry only if transient;
- otherwise hold and report exact blocker.

Analytics unavailable:

- publish/readback can still be valid;
- data-driven self-optimization cannot be claimed until metrics return.

## QA And Release Gates

Required local gates:

- blog system smoke;
- market newsroom smoke;
- daily closeout with new 8+ market-news floor;
- public readback for at least one same-day market-news item and one column;
- OG image metadata probe for latest posts;
- AWS smoke;
- performance smoke;
- Chrome rendered QA in Tommy's existing Chrome profile.

Required production evidence:

- `/api/blog?language=zh-Hant` shows at least 8 same-day `contentType=breaking`
  groups;
- all 8 have full 9-language coverage;
- `/blog` renders market-news cards;
- article detail pages render images without broken placeholders;
- OG metadata points to the article image;
- daily closeout reports no artificial total publication cap.

## Rollback

Code rollback:

- git revert the implementation commit.

Runtime rollback:

- deploy previous ECS task definition revision.

Content rollback:

- use S3 CMS prior release manifest or targeted release repair.

Scheduler rollback:

- disable the new high-throughput market loop and keep the old scheduled
  market-scan windows temporarily, while preserving the updated closeout
  reporting so the reduced volume is visible.

## Open Questions Resolved

- Market-news minimum is 8/day, not 5/day.
- 8/day is a floor, not a cap.
- Total daily publication count has no upper cap.
- Use 24-hour sources first and 72-hour evergreen fill when needed.
- Quality gate failure means repair or replacement, not silent skip.
- The system should optimize toward AdSense and SEO/GEO growth, not just
  minimal publishing completion.
