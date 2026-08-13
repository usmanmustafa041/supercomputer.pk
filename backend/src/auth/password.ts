/**
 * Password hashing, using only what Node already ships.
 *
 * scrypt is deliberately slow and memory-hungry, which is the point: it makes
 * guessing passwords in bulk expensive. Node has it built in, so there is no
 * native module to compile and nothing extra to install.
 *
 * Stored as: scrypt$N$r$p$salt$hash, all hex. Keeping the parameters in the
 * string means old passwords still verify after the cost is raised.
 */

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const N = 16384; // roughly 100ms on ordinary hardware
const r = 8;
const p = 1;
const KEY_LEN = 32;
const MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LEN, { N, r, p, maxmem: MAXMEM });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, sN, sr, sp, saltHex, keyHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");

  let actual: Buffer;
  try {
    actual = await scrypt(password, salt, expected.length, {
      N: Number(sN),
      r: Number(sr),
      p: Number(sp),
      maxmem: MAXMEM,
    });
  } catch {
    return false;
  }

  // Compares in constant time. A plain === leaks how much of the hash matched
  // through how long the comparison took.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
