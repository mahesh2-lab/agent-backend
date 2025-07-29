import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();

export function verifyLiveKitToken(token) {
  if (!token) {
    return { valid: false, error: "Token or secret missing" };
  }
  const secret = process.env.LIVEKIT_API_SECRET;

  try {
    const decoded = jwt.verify(token, secret);
    return { valid: true, payload: decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
