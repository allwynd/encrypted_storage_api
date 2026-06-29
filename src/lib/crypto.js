const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV is recommended for GCM
const KEY_LENGTH = 32; // 256 bits

/**
 * Loads and validates the master encryption key from the environment.
 * Expected format: base64-encoded 32-byte (256-bit) key.
 * Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
function getEncryptionKey() {
  const rawKey = process.env.VAULT_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("VAULT_ENCRYPTION_KEY environment variable is not set.");
  }

  const key = Buffer.from(rawKey, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `VAULT_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH} bytes (got ${key.length}). ` +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  return key;
}

/**
 * Encrypts a JSON-serializable object with AES-256-GCM.
 * Returns the pieces needed for storage and later decryption.
 */
function encryptJson(plainObject) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = Buffer.from(JSON.stringify(plainObject), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    algorithm: ALGORITHM,
  };
}

/**
 * Decrypts a record produced by encryptJson back into the original object.
 */
function decryptJson({ ciphertext, iv, authTag, algorithm }) {
  if (algorithm !== ALGORITHM) {
    throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
  }
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}

module.exports = { encryptJson, decryptJson };
