/*
 * End-to-end proof for direct-message encryption.
 *
 * Replicates exactly what src/utils/e2e.js does in the browser (same WebCrypto
 * primitives), then checks the one property that matters: the server stores
 * ciphertext it cannot read, while the intended recipient can read it.
 *
 *   node e2e-dm-test.mjs [gatewayUrl]
 */
const GW = process.argv[2] || "http://localhost:8080";
const PASS = "Northstar@2026";
const A = "maya.hassan@northstar.io";
const B = "omar.nabil@northstar.io";

let failed = 0;
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m) => { console.log(`  \x1b[31m✗\x1b[0m ${m}`); failed++; };

const b64 = (buf) => Buffer.from(new Uint8Array(buf)).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));
const subtle = globalThis.crypto.subtle;

// ── mirror of src/utils/e2e.js ───────────────────────────────────────────────
const genKeypair = () => subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
async function deriveKey(privateKey, peerJwkString) {
  const peerKey = await subtle.importKey("jwk", JSON.parse(peerJwkString), { name: "ECDH", namedCurve: "P-256" }, false, []);
  return subtle.deriveKey({ name: "ECDH", public: peerKey }, privateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encryptFor(privateKey, peerPub, text) {
  const key = await deriveKey(privateKey, peerPub);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return `vo1:${b64(iv)}:${b64(ct)}`;
}
async function decryptFrom(privateKey, peerPub, payload) {
  const [, ivB64, ctB64] = payload.split(":");
  const key = await deriveKey(privateKey, peerPub);
  const pt = await subtle.decrypt({ name: "AES-GCM", iv: unb64(ivB64) }, key, unb64(ctB64));
  return new TextDecoder().decode(pt);
}

const api = async (token, method, path, body) => {
  const r = await fetch(`${GW}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const t = await r.text();
  let d; try { d = t ? JSON.parse(t) : null; } catch { d = t; }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${t.slice(0, 120)}`);
  return d;
};
const login = async (email) => (await api(null, "POST", "/api/auth/login", { email, password: PASS }));

(async () => {
  console.log(`E2E direct-message encryption test -> ${GW}\n`);

  const a = await login(A), b = await login(B);
  ok(`logged in: ${a.firstName} (${a.id}) and ${b.firstName} (${b.id})`);

  // 1. Each "browser" makes a keypair and publishes ONLY the public half.
  const kpA = await genKeypair(), kpB = await genKeypair();
  const pubA = JSON.stringify(await subtle.exportKey("jwk", kpA.publicKey));
  const pubB = JSON.stringify(await subtle.exportKey("jwk", kpB.publicKey));
  await api(a.token, "PUT", "/api/users/me/e2e-key", { publicKey: pubA });
  await api(b.token, "PUT", "/api/users/me/e2e-key", { publicKey: pubB });
  ok("both users published a public key (private keys never sent)");

  // 2. The server must only ever hold public keys.
  const dir = await api(a.token, "GET", "/api/users");
  const rowB = dir.find((u) => u.id === b.id);
  const jwkB = JSON.parse(rowB.e2ePublicKey);
  if (jwkB.d) bad("SERVER HAS A PRIVATE KEY COMPONENT ('d') — not E2E!");
  else ok("directory exposes public JWK only (no 'd' private component)");

  // 3. A encrypts a secret for B and sends it as a real DM.
  const SECRET = `top secret ${Math.random().toString(36).slice(2)} — the server must never read this`;
  const dm = await api(a.token, "POST", "/api/chat/dm", { targetUserId: b.id });
  const sealed = await encryptFor(kpA.privateKey, rowB.e2ePublicKey, SECRET);
  const sent = await api(a.token, "POST", `/api/chat/channels/${dm.id}/messages`, { content: sealed });
  ok(`sent an encrypted DM (${sealed.length} chars of ciphertext)`);

  // 4. What the server actually stored.
  const stored = (await api(b.token, "GET", `/api/chat/channels/${dm.id}/messages?page=1&limit=5`)).content
    .find((m) => m.id === sent.id);
  if (!stored) return bad("message not found for recipient");
  if (stored.content.includes(SECRET)) bad("SERVER STORED PLAINTEXT — encryption did not apply!");
  else ok("server-stored content does NOT contain the plaintext");
  if (!stored.content.startsWith("vo1:")) bad(`unexpected stored format: ${stored.content.slice(0, 24)}`);
  else ok(`server sees only: ${stored.content.slice(0, 46)}…`);

  // 5. The recipient can read it; an unrelated key cannot.
  const dirB = await api(b.token, "GET", "/api/users");
  const readBack = await decryptFrom(kpB.privateKey, dirB.find((u) => u.id === a.id).e2ePublicKey, stored.content);
  readBack === SECRET ? ok("recipient decrypted it correctly (round-trip matches)") : bad(`decrypt mismatch: ${readBack}`);

  const kpE = await genKeypair(); // an eavesdropper with their own key
  try {
    await decryptFrom(kpE.privateKey, rowB.e2ePublicKey, stored.content);
    bad("an unrelated key DECRYPTED the message — broken!");
  } catch { ok("an unrelated keypair cannot decrypt it (AES-GCM auth fails)"); }

  // 6. Tampering must be detected.
  const tampered = stored.content.slice(0, -6) + "AAAAAA";
  try {
    await decryptFrom(kpB.privateKey, dirB.find((u) => u.id === a.id).e2ePublicKey, tampered);
    bad("tampered ciphertext still decrypted — no integrity!");
  } catch { ok("tampered ciphertext is rejected (integrity holds)"); }

  console.log(failed ? `\n\x1b[31m${failed} check(s) FAILED\x1b[0m` : "\n\x1b[32mAll checks passed — the server cannot read DM content.\x1b[0m");
  process.exit(failed ? 1 : 0);
})().catch((e) => { bad(String(e.message || e)); process.exit(1); });
