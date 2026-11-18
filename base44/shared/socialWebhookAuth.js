// Authenticity checks for the social lead webhooks, plus a safe secret reader. Web Crypto only.

const encoder = new TextEncoder();

async function hmac(hash, key, message) {
  const cryptoKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
}

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));

/** Reads a secret by name: '' while it hasn't been added in Secrets. Pass `secrets` from base44:runtime. */
export const secretReader = (secrets) => (name) => {
  try {
    return secrets.get(name) || '';
  } catch {
    return '';
  }
};

/** Constant-time comparison; false when either side is empty. */
export function safeEqual(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  if (!x || x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

/** Meta: X-Hub-Signature-256 is "sha256=" + hex HMAC-SHA256 of the raw body, keyed with the App Secret. */
export async function validMetaSignature(rawBody, header, appSecret) {
  if (!appSecret || !header) return false;
  return safeEqual(header, `sha256=${toHex(await hmac('SHA-256', appSecret, rawBody))}`);
}

/**
 * Twilio: X-Twilio-Signature is base64 HMAC-SHA1 of the called URL followed by every POST field
 * (sorted by name, name + value), keyed with the Auth Token. `urls` lists the addresses the
 * webhook may have been registered under.
 */
export async function validTwilioSignature(urls, params, header, authToken) {
  if (!authToken || !header) return false;
  const fields = Object.keys(params).sort().map((name) => name + params[name]).join('');
  for (const url of urls) {
    if (safeEqual(header, toBase64(await hmac('SHA-1', authToken, url + fields)))) return true;
  }
  return false;
}