export default function sharpDisabled() {
  throw new Error("Sharp image optimization is disabled for the Cloudflare build. Serve pre-generated images directly.");
}

export const versions = {};

