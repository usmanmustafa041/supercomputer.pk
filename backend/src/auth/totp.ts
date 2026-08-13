import { createHmac, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32Encode(buf: Buffer): string {
  let bits = 0; let value = 0; let out = "";
  for (const byte of buf) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}
function base32Decode(input: string): Buffer {
  let bits = 0; let value = 0; const bytes: number[] = [];
  for (const c of input.replace(/=+$/, "").toUpperCase()) { const n = ALPHABET.indexOf(c); if (n < 0) continue; value = (value << 5) | n; bits += 5; if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(bytes);
}
export function createTotpSecret(): string { return base32Encode(randomBytes(20)); }
export function totpCode(secret: string, counter = Math.floor(Date.now() / 30_000)): string {
  const msg = Buffer.alloc(8); msg.writeBigInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const offset = digest[digest.length - 1] & 15;
  const n = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(n).padStart(6, "0");
}
export function verifyTotp(secret: string, code: string): boolean {
  return [-1, 0, 1].some((offset) => totpCode(secret, Math.floor(Date.now() / 30_000) + offset) === code);
}
