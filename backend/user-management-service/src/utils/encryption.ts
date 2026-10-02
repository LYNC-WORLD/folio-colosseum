import crypto from "crypto";

const algorithm = "aes-256-cbc";

const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 characters long, got ${
        key ? key.length : 0
      }`
    );
  }
  return Buffer.from(key, "utf8");
};

export const encrypt = (text: string): string => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const combined = iv.toString("hex") + ":" + encrypted;

    return combined;
  } catch (error) {
    throw new Error(
      `Encryption failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

export const decrypt = (encryptedText: string): string => {
  try {
    const key = getEncryptionKey();

    const parts = encryptedText.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted text format");
    }

    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};