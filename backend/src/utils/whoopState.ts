import crypto from "crypto";

const stateSecret = resolveStateSecret();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export type WhoopState = {
  userId: number;
  nonce: string;
  timestamp: number;
};

export function serializeState(input: { userId: number }): string {
  const payload = {
    uid: input.userId,
    nonce: crypto.randomBytes(12).toString("hex"),
    ts: Date.now(),
  };
  const payloadString = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", stateSecret).update(payloadString).digest("hex");

  return Buffer.from(`${payloadString}.${signature}`).toString("base64url");
}

export function parseAndValidateState(state: string): WhoopState {
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    throw new Error("Invalid state encoding");
  }

  const [payloadString, signature] = decoded.split(".");
  if (!payloadString || !signature) {
    throw new Error("Invalid state format");
  }

  const expectedSignature = crypto
    .createHmac("sha256", stateSecret)
    .update(payloadString)
    .digest("hex");

  let providedSignature: Buffer;
  let expectedSignatureBuffer: Buffer;
  try {
    providedSignature = Buffer.from(signature, "hex");
    expectedSignatureBuffer = Buffer.from(expectedSignature, "hex");
  } catch {
    throw new Error("Invalid state signature encoding");
  }

  if (providedSignature.length !== expectedSignatureBuffer.length) {
    throw new Error("Invalid state signature length");
  }

  if (!crypto.timingSafeEqual(providedSignature, expectedSignatureBuffer)) {
    throw new Error("Invalid state signature");
  }

  const payload = JSON.parse(payloadString) as { uid: number; nonce: string; ts: number };

  if (!payload?.uid || !payload?.nonce || !payload?.ts) {
    throw new Error("Invalid state payload");
  }

  if (Date.now() - payload.ts > STATE_TTL_MS) {
    throw new Error("State has expired");
  }

  return { userId: payload.uid, nonce: payload.nonce, timestamp: payload.ts };
}

function resolveStateSecret(): string {
  const secret =
    process.env.WHOOP_STATE_SECRET ?? process.env.JWT_SECRET ?? process.env.WHOOP_CLIENT_SECRET;

  if (!secret) {
    throw new Error("Missing state secret for Whoop OAuth flow");
  }

  return secret;
}
