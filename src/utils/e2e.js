/*
 * End-to-end encryption for direct messages.
 *
 * How it works
 *   - Each browser generates an ECDH P-256 keypair. The PRIVATE key is stored
 *     only in localStorage and is never transmitted; only the public half is
 *     published (PUT /api/users/me/e2e-key).
 *   - To message someone we do ECDH against their published public key, derive
 *     an AES-GCM-256 key with HKDF, and encrypt in the browser.
 *   - The server (and the database, and anyone reading the network) only ever
 *     sees `vo1:<iv>:<ciphertext>`. It has no private key, so it cannot decrypt.
 *
 * Scope + honest limitations
 *   - DMs only. Channels stay server-readable on purpose: search, the 3-month
 *     history and the AI assistant all need plaintext. Encrypting channels would
 *     silently break those.
 *   - The private key lives in one browser's localStorage. Clearing site data or
 *     signing in elsewhere means old DMs can't be read (no key backup / no
 *     multi-device sync). That is the honest cost of the server not holding keys.
 *   - No forward secrecy (static ECDH, no ratchet) and public keys are trusted
 *     on first use — a malicious server could serve a wrong public key. Real
 *     protection against that needs out-of-band key verification.
 */
import axiosInstance from "../api/axiosInstance";

const PREFIX = "vo1:";
const store = (userId) => `vo-e2e-priv-${userId}`;

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const subtle = () => {
  // Requires a secure context: https, or http on localhost. Over plain http to a
  // LAN IP, window.crypto.subtle is undefined and we fall back to plaintext.
  if (typeof window === "undefined" || !window.crypto?.subtle) return null;
  return window.crypto.subtle;
};

export const e2eAvailable = () => subtle() !== null;

/** True if this looks like one of our encrypted payloads. */
export const isEncrypted = (text) => typeof text === "string" && text.startsWith(PREFIX);

/**
 * Load this user's keypair, generating and publishing one on first use.
 * Returns { privateKey, publicJwk } or null when WebCrypto is unavailable.
 */
export async function ensureKeypair(userId) {
  const s = subtle();
  if (!s || !userId) return null;

  const saved = localStorage.getItem(store(userId));
  if (saved) {
    try {
      const { priv, pub } = JSON.parse(saved);
      const privateKey = await s.importKey("jwk", priv, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);
      return { privateKey, publicJwk: pub };
    } catch {
      /* corrupt entry — fall through and regenerate */
    }
  }

  const pair = await s.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  const priv = await s.exportKey("jwk", pair.privateKey);
  const pub = await s.exportKey("jwk", pair.publicKey);
  try {
    localStorage.setItem(store(userId), JSON.stringify({ priv, pub }));
  } catch {
    return null; // no storage -> we'd lose the key on reload; don't pretend
  }
  await publishPublicKey(pub);
  // Re-import non-extractable for use.
  const privateKey = await s.importKey("jwk", priv, { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]);
  return { privateKey, publicJwk: pub };
}

/** Publish the public half so peers can encrypt to us. Best-effort. */
export async function publishPublicKey(publicJwk) {
  try {
    await axiosInstance.put("/api/users/me/e2e-key", { publicKey: JSON.stringify(publicJwk) });
    return true;
  } catch {
    return false;
  }
}

/** Make sure the server has our current public key (cheap to repeat). */
export async function syncPublicKey(userId, serverKey) {
  const kp = await ensureKeypair(userId);
  if (!kp) return null;
  const mine = JSON.stringify(kp.publicJwk);
  if (serverKey !== mine) await publishPublicKey(kp.publicJwk);
  return kp;
}

async function deriveKey(privateKey, peerJwkString) {
  const s = subtle();
  if (!s || !peerJwkString) return null;
  let peerJwk;
  try {
    peerJwk = typeof peerJwkString === "string" ? JSON.parse(peerJwkString) : peerJwkString;
  } catch {
    return null;
  }
  const peerKey = await s.importKey("jwk", peerJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  return s.deriveKey(
    { name: "ECDH", public: peerKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt `text` for a peer. Returns null if we can't (caller should not send). */
export async function encryptFor(privateKey, peerPublicKey, text) {
  const s = subtle();
  if (!s) return null;
  const key = await deriveKey(privateKey, peerPublicKey);
  if (!key) return null;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ct = await s.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return `${PREFIX}${b64(iv)}:${b64(ct)}`;
}

/** Decrypt one of our payloads. Returns null when it can't be read. */
export async function decryptFrom(privateKey, peerPublicKey, payload) {
  const s = subtle();
  if (!s || !isEncrypted(payload)) return null;
  const [, ivB64, ctB64] = payload.split(":");
  if (!ivB64 || !ctB64) return null;
  try {
    const key = await deriveKey(privateKey, peerPublicKey);
    if (!key) return null;
    const pt = await s.decrypt({ name: "AES-GCM", iv: unb64(ivB64) }, key, unb64(ctB64));
    return new TextDecoder().decode(pt);
  } catch {
    return null; // wrong key / tampered / from another device
  }
}
