# AWS Login And Website Deploy Runbook

This runbook publishes the ALTOS LAB official website to the current AWS
production stack.

Production stack:

- AWS account: `487316829524`
- Region: `ap-northeast-1`
- ECR repository: `altoslab-official-website`
- ECS cluster: `altoslab-web`
- ECS service: `altoslab-web-service`
- ECS task family: `altoslab-official-website`
- Production URL: `https://altoslab-ai.cc`
- Expected CMS provider: `aws-s3`

Do not paste AWS secrets, passwords, MFA codes, or local env-file contents into
chat or GitHub. Keep secrets in `~/.altoslab-aws.env` or AWS Secrets Manager.

## 1. Log In To AWS

Use the configured `altoslab` AWS profile.

```bash
aws login --profile altoslab
```

If same-device browser callback does not work, use remote mode:

```bash
aws login --profile altoslab --remote
```

Open the printed AWS URL in Chrome, complete AWS sign-in and MFA yourself, then
paste the authorization code back into the terminal prompt.

Verify the session:

```bash
aws sts get-caller-identity --profile altoslab
```

Expected account:

```text
487316829524
```

## 2. Load Local Deploy Environment

The local operator env file should contain non-committed secrets and runtime
settings.

```bash
set -a
source "$HOME/.altoslab-aws.env"
set +a
export AWS_PROFILE="${AWS_PROFILE:-altoslab}"
export AWS_REGION="${AWS_REGION:-ap-northeast-1}"
export AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-487316829524}"
```

Confirm required runtime variables are present without printing secret values:

```bash
for key in \
  AWS_PROFILE AWS_REGION AWS_ACCOUNT_ID AWS_S3_BUCKET AWS_S3_CMS_PATH \
  ADMIN_PASSWORD ADMIN_SESSION_TOKEN BLOG_INGEST_HMAC_SECRET CMS_ENCRYPTION_KEY CRON_SECRET
do
  test -n "${!key:-}" && echo "$key=<set>" || echo "$key=<missing>"
done
```

## 3. Validate Local Source

Run the same checks used by the protected UI guardrails.

```bash
npm test
npm run build:aws
```

If `.next` type artifacts become stale, remove only generated `.next` artifacts
and rerun:

```bash
rm -rf .next
npm test
npm run build:aws
```

## 4. Build And Push The Container Image

Use a unique tag. Date-based tags make rollback easier.

```bash
export IMAGE_TAG="deploy-$(date -u +%Y%m%d-%H%M%S)"
export ECR_REPO="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/altoslab-official-website"

aws ecr get-login-password --profile "$AWS_PROFILE" --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker buildx build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_SITE_URL=https://altoslab-ai.cc \
  --build-arg NEXT_PUBLIC_GTM_ID="${NEXT_PUBLIC_GTM_ID:-GTM-WJ96VR7V}" \
  --build-arg NEXT_PUBLIC_GA_MEASUREMENT_ID="${NEXT_PUBLIC_GA_MEASUREMENT_ID:-G-5VSLFNVD28}" \
  --build-arg NEXT_PUBLIC_ADSENSE_CLIENT="${NEXT_PUBLIC_ADSENSE_CLIENT:-ca-pub-8663357592872896}" \
  --build-arg NEXT_PUBLIC_ADSENSE_BLOG_ADS_ENABLED="${NEXT_PUBLIC_ADSENSE_BLOG_ADS_ENABLED:-true}" \
  --build-arg NEXT_PUBLIC_ADSENSE_BLOG_INDEX_SLOT="${NEXT_PUBLIC_ADSENSE_BLOG_INDEX_SLOT:-}" \
  --build-arg NEXT_PUBLIC_ADSENSE_BLOG_AFTER_SUMMARY_SLOT="${NEXT_PUBLIC_ADSENSE_BLOG_AFTER_SUMMARY_SLOT:-}" \
  --build-arg NEXT_PUBLIC_ADSENSE_BLOG_MID_ARTICLE_SLOT="${NEXT_PUBLIC_ADSENSE_BLOG_MID_ARTICLE_SLOT:-}" \
  --build-arg NEXT_PUBLIC_ADSENSE_BLOG_BEFORE_RELATED_SLOT="${NEXT_PUBLIC_ADSENSE_BLOG_BEFORE_RELATED_SLOT:-}" \
  --build-arg CANONICAL_REDIRECT_HOSTS="${CANONICAL_REDIRECT_HOSTS:-www.altoslab-ai.cc,altoslab.com,www.altoslab.com,altoslab-offcial-website.vercel.app}" \
  -t "${ECR_REPO}:$IMAGE_TAG" \
  -t "${ECR_REPO}:latest" \
  --push .
```

## 5. Register A New ECS Task Definition

Start from the currently active task definition, replace only the image, and
register a new revision.

```bash
CURRENT_TASK_DEF="$(
  aws ecs describe-services \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --cluster altoslab-web \
    --services altoslab-web-service \
    --query 'services[0].taskDefinition' \
    --output text
)"

aws ecs describe-task-definition \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --task-definition "$CURRENT_TASK_DEF" \
  --query 'taskDefinition' \
  > /tmp/altoslab-task-definition-current.json

jq --arg image "${ECR_REPO}:$IMAGE_TAG" '
  del(
    .taskDefinitionArn,
    .revision,
    .status,
    .requiresAttributes,
    .compatibilities,
    .registeredAt,
    .registeredBy
  )
  | .containerDefinitions[0].image = $image
' /tmp/altoslab-task-definition-current.json > /tmp/altoslab-task-definition-next.json

NEW_TASK_DEF="$(
  aws ecs register-task-definition \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --cli-input-json file:///tmp/altoslab-task-definition-next.json \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text
)"

echo "$NEW_TASK_DEF"
```

## 6. Update The ECS Service

```bash
aws ecs update-service \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --cluster altoslab-web \
  --service altoslab-web-service \
  --task-definition "$NEW_TASK_DEF"

aws ecs wait services-stable \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --cluster altoslab-web \
  --services altoslab-web-service
```

Confirm the rollout:

```bash
aws ecs describe-services \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --cluster altoslab-web \
  --services altoslab-web-service \
  --query 'services[0].{desired:desiredCount,running:runningCount,taskDefinition:taskDefinition,deployments:deployments[*].{status:status,rolloutState:rolloutState,taskDefinition:taskDefinition}}'
```

## 7. Verify Production

Run AWS smoke after ECS is stable:

```bash
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
```

Required signals:

- `/` returns the full homepage.
- `/blog` and localized blog indexes return 200.
- One public article detail page has non-empty `.rich-text`.
- `/api/health` reports `cmsStorage.provider: aws-s3`.
- `/api/health` reports generated media S3 storage configured.
- `www.altoslab-ai.cc/blog` redirects to `https://altoslab-ai.cc/blog`.

## 8. Roll Back If Needed

Find earlier task definition revisions:

```bash
aws ecs list-task-definitions \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --family-prefix altoslab-official-website \
  --sort DESC \
  --max-items 10
```

Update the service back to a known-good task definition:

```bash
aws ecs update-service \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --cluster altoslab-web \
  --service altoslab-web-service \
  --task-definition arn:aws:ecs:ap-northeast-1:487316829524:task-definition/altoslab-official-website:<revision>

aws ecs wait services-stable \
  --profile "$AWS_PROFILE" \
  --region "$AWS_REGION" \
  --cluster altoslab-web \
  --services altoslab-web-service
```

Then rerun:

```bash
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
```

## 9. Commit And Push

After production smoke passes:

```bash
git status --short
npm test
git add <intended-files>
git commit -m "Add blog AdSense AWS deployment support"
git push origin main
```

If the branch is behind origin, fetch first and reconcile safely:

```bash
git fetch origin main
git status -sb
git merge --ff-only origin/main
```

If fast-forward is blocked by local changes, stash deliberately, fast-forward,
then reapply and retest:

```bash
git stash push -u -m "pre-aws-deploy-publish"
git merge --ff-only origin/main
git stash apply stash@{0}
npm test
```
