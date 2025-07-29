import { createToken as createTokenService } from "../services/token.service.js";
import { verifyLiveKitToken } from "../utils/verify_token.js";

export const createToken = async (req, res) => {
  try {
    const name = req.query.name || "my name";
    const { candidateDetails = "", jobDescription = "" } = req.body || {};

    const result = await createTokenService(
      name,
      candidateDetails,
      jobDescription
    );

    res.json(result);
  } catch (error) {
    console.error("Error creating token:", error);
    res.status(500).json({ error: error.message });
  }
};

export const verifyToken = (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  const result = verifyLiveKitToken(token);
  if (result.valid) {
    res.status(200).json(result);
  } else {
    res.status(401).json(result);
  }
};
