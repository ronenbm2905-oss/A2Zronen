import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { serverEnv } from "@/config/server-env";
import { AppError, ERROR_CODES } from "@/lib/errors";

/**
 * Authenticated encryption for secrets this system stores on a user's behalf —
 * today that means Telegram bot tokens.
 *
 * AES-256-GCM, not AES-CBC or a bare cipher: the tag makes tampering with a
 * stored ciphertext a decryption *failure* rather than a silently different
 * plaintext. A Firestore document is not a trusted store — anyone with console
 * access to the project can edit it — so integrity matters as much as secrecy.
 *
 * The serialized form is `v1.<iv>.<tag>.<ciphertext>`, all base64url. The
 * version prefix exists so a future key-rotation or algorithm change can be
 * recognised rather than guessed at.
 */

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12; // 96 bits — the size GCM is specified for.

const MISSING_KEY_MESSAGE =
  "SECRET_ENCRYPTION_KEY is not set. Generate 32 random bytes and add it to .env.local before storing integration secrets.";

let cachedKey: Buffer | null = null;

/**
 * Accept the key as base64 or hex, whichever the operator pasted. Both decode
 * to exactly 32 bytes or the key is rejected — Node would otherwise happily
 * accept a short buffer from a truncated paste and encrypt with a weak key.
 */
function readKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = serverEnv.secretEncryptionKey;
  if (!raw) throw AppError.config(MISSING_KEY_MESSAGE);

  const candidates = [
    Buffer.from(raw, "base64"),
    /^[0-9a-fA-F]+$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.alloc(0),
  ];

  const key = candidates.find((buffer) => buffer.length === KEY_BYTES);

  if (!key) {
    throw AppError.config(
      `SECRET_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (base64 or hex).`,
    );
  }

  cachedKey = key;
  return key;
}

/** Encrypt a UTF-8 secret. The result is safe to persist. */
export function sealSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, readKey(), iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/**
 * Reverse {@link sealSecret}.
 *
 * @throws {AppError} `CONFIG_ERROR` when the key is missing or the payload does
 * not authenticate — which is the same observable outcome as a rotated key, and
 * deliberately so: the caller's only correct response to either is to ask the
 * user to reconnect.
 */
export function openSecret(sealed: string): string {
  const [version, ivPart, tagPart, dataPart] = sealed.split(".");

  if (version !== VERSION || !ivPart || !tagPart || !dataPart) {
    throw AppError.config("Stored secret is not in the expected format.");
  }

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      readKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    throw new AppError(
      ERROR_CODES.CONFIG_ERROR,
      "Stored secret could not be decrypted. SECRET_ENCRYPTION_KEY may have changed.",
      { cause: error },
    );
  }
}

/**
 * Constant-time string comparison for shared secrets — the Telegram webhook
 * secret header, specifically.
 *
 * Length is compared first and non-constant-time, which leaks only the length
 * of the expected value. `timingSafeEqual` throws on a length mismatch, so
 * there is no way to avoid that without padding, and a secret's length is not
 * the part worth protecting.
 */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) return false;

  return timingSafeEqual(left, right);
}

/** A URL-safe random identifier, used for webhook paths and link codes. */
export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}
