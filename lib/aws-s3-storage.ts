import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

const DEFAULT_CMS_STORAGE_KEY = "altoslab:cms:v1";
const DEFAULT_AWS_REGION = "ap-northeast-1";
const DEFAULT_AWS_MEDIA_PREFIX = "blog-generated";

export type AwsS3StorageConfig = {
  enabled: boolean;
  bucket: string;
  region: string;
  cmsKey: string;
  cmsPathname: string;
  mediaPrefix: string;
};

export type AwsS3ObjectRead = {
  name: string;
  etag: string;
  contentType: string;
  size: number;
  arrayBuffer: ArrayBuffer;
};

export type AwsS3ListedObject = {
  name: string;
  etag?: string;
  updated?: string;
};

export class AwsS3PreconditionError extends Error {
  constructor(message = "AWS S3 precondition failed") {
    super(message);
    this.name = "AwsS3PreconditionError";
  }
}

const clients = new Map<string, S3Client>();

function safeStorageKey(key: string) {
  return key.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "altoslab-cms-v1";
}

function safeObjectSegment(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "cover.png";
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function toBody(value: string | Buffer | ArrayBuffer | Uint8Array) {
  if (typeof value === "string") return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return value;
}

function copyToArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function normalizeEtag(value = "") {
  return value.replace(/^"+|"+$/g, "");
}

export function awsS3CmsPathname(key = process.env.CMS_STORAGE_KEY || DEFAULT_CMS_STORAGE_KEY) {
  return process.env.AWS_S3_CMS_PATH?.trim() || `cms/${safeStorageKey(key)}.json`;
}

export function awsS3MediaPathname(filename: string) {
  const prefix = trimSlashes(process.env.AWS_S3_MEDIA_PREFIX || DEFAULT_AWS_MEDIA_PREFIX);
  return `${prefix}/${safeObjectSegment(filename)}`;
}

export function getAwsS3StorageConfig(): AwsS3StorageConfig | null {
  const bucket = process.env.AWS_S3_BUCKET?.trim() || process.env.S3_BUCKET?.trim();
  const enabled = process.env.AWS_S3_STORAGE_ENABLED === "1" || Boolean(bucket && process.env.AWS_S3_STORAGE_ENABLED !== "0");
  if (!enabled || !bucket) return null;

  const cmsKey = process.env.CMS_STORAGE_KEY || DEFAULT_CMS_STORAGE_KEY;
  return {
    enabled: true,
    bucket,
    region: process.env.AWS_REGION?.trim() || process.env.AWS_DEFAULT_REGION?.trim() || DEFAULT_AWS_REGION,
    cmsKey,
    cmsPathname: awsS3CmsPathname(cmsKey),
    mediaPrefix: trimSlashes(process.env.AWS_S3_MEDIA_PREFIX || DEFAULT_AWS_MEDIA_PREFIX)
  };
}

export function isAwsS3StorageConfigured() {
  return Boolean(getAwsS3StorageConfig());
}

export function requireAwsS3StorageConfig() {
  const config = getAwsS3StorageConfig();
  if (!config) throw new Error("AWS S3 storage is enabled but AWS_S3_BUCKET is not configured.");
  return config;
}

export function awsS3Client(config: AwsS3StorageConfig) {
  const key = `${config.region}:${config.bucket}`;
  const cached = clients.get(key);
  if (cached) return cached;
  const client = new S3Client({ region: config.region });
  clients.set(key, client);
  return client;
}

async function bodyToArrayBuffer(body: unknown) {
  if (!body) return new ArrayBuffer(0);
  if (body instanceof Uint8Array) {
    return copyToArrayBuffer(body);
  }
  if (typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function") {
    const bytes = await (body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
    return copyToArrayBuffer(bytes);
  }
  const response = new Response(body as BodyInit);
  return response.arrayBuffer();
}

export async function readAwsS3Object(config: AwsS3StorageConfig, objectName: string): Promise<AwsS3ObjectRead | null> {
  try {
    const result = await awsS3Client(config).send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectName
      })
    );
    const arrayBuffer = await bodyToArrayBuffer(result.Body);
    return {
      name: objectName,
      etag: normalizeEtag(result.ETag),
      contentType: result.ContentType || "application/octet-stream",
      size: Number(result.ContentLength || arrayBuffer.byteLength),
      arrayBuffer
    };
  } catch (error) {
    if ((error as { name?: string })?.name === "NoSuchKey" || (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function readAwsS3Text(config: AwsS3StorageConfig, objectName: string) {
  const object = await readAwsS3Object(config, objectName);
  if (!object) return null;
  return {
    etag: object.etag,
    text: Buffer.from(object.arrayBuffer).toString("utf8")
  };
}

export async function listAwsS3Objects(config: AwsS3StorageConfig, prefix: string, limit = 1000) {
  const objects: AwsS3ListedObject[] = [];
  let continuationToken: string | undefined;

  do {
    const result = await awsS3Client(config).send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: prefix,
        MaxKeys: Math.min(1000, Math.max(1, limit - objects.length)),
        ContinuationToken: continuationToken
      })
    );
    for (const item of result.Contents || []) {
      if (!item.Key) continue;
      objects.push({
        name: item.Key,
        etag: normalizeEtag(item.ETag),
        updated: item.LastModified?.toISOString()
      });
      if (objects.length >= limit) return objects;
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

export async function writeAwsS3Object(
  config: AwsS3StorageConfig,
  objectName: string,
  value: string | Buffer | ArrayBuffer | Uint8Array,
  contentType: string,
  options: { ifMatch?: string; ifNoneMatch?: "*" } = {}
) {
  try {
    await awsS3Client(config).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectName,
        Body: toBody(value),
        ContentType: contentType,
        CacheControl: contentType === "application/json" ? "no-store" : "public, max-age=31536000, immutable",
        ...(options.ifMatch ? { IfMatch: options.ifMatch } : {}),
        ...(options.ifNoneMatch ? { IfNoneMatch: options.ifNoneMatch } : {})
      })
    );
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 409 || status === 412 || (error as { name?: string })?.name === "PreconditionFailed") {
      throw new AwsS3PreconditionError();
    }
    throw error;
  }
}

export async function deleteAwsS3Object(config: AwsS3StorageConfig, objectName: string) {
  await awsS3Client(config).send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: objectName
    })
  );
}
