import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function key(): Buffer {
  const raw = process.env.AUTH_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_ENCRYPTION_KEY is required in production.");
    return Buffer.alloc(32, 7);
  }
  return createHmac("sha256", "supercomputers-auth").update(raw).digest();
}

function base32Encode(input: Buffer): string {
  let bits = "";
  for (const byte of input) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) out += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}

function base32Decode(input: string): Buffer {
  let bits = "";
  for (const char of input.replace(/=+$/g, "").toUpperCase()) {
    const n = ALPHABET.indexOf(char);
    if (n < 0) throw new Error("Invalid TOTP secret");
    bits += n.toString(2).padStart(5, "0");
  }
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => parseInt(b, 2)));
}

export function newTotpSecret(): string { return base32Encode(randomBytes(20)); }

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptTotpSecret(value: string): string {
  const [iv, tag, ciphertext] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function codeAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, value: string): boolean {
  if (!/^\d{6}$/.test(value)) return false;
  const now = Math.floor(Date.now() / 30_000);
  return [-1, 0, 1].some((drift) => {
    const expected = Buffer.from(codeAt(secret, now + drift));
    const actual = Buffer.from(value);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

export function totpUri(secret: string, email: string): string {
  return `otpauth://totp/${encodeURIComponent(`Supercomputers:${email}`)}?secret=${secret}&issuer=Supercomputers&digits=6&period=30`;
}
