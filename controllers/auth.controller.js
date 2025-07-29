import Analysis from "../models/analysis.model.js";
import { hashPassword, verifyPassword } from "../utils/generate_password.js";
import { verifyLiveKitToken } from "../utils/verify_token.js";

// Improved: Use async/await, better error handling, and consistent responses

export const checkPassword = async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return res.status(400).json({ success: false, error: "ID and password are required" });
    }

    const analysis = await Analysis.findById(id).exec();
    if (!analysis) {
      return res.status(404).json({ success: false, error: "Analysis not found" });
    }

    console.log(analysis.password, hashPassword(password));
    

    if (verifyPassword(password, analysis.password)) {
      return res.status(200).json({ success: true, message: "Password is correct" });
    } else {
      return res.status(401).json({ success: false, error: "Incorrect password" });
    }
  } catch (error) {
    console.error("Error checking password:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const getdata = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: "Room name is required" });
    }

    const data = await Analysis.findById(id).exec();
    if (!data) {
      return res.status(404).json({ success: false, error: "Data not found" });
    }

    const response = verifyLiveKitToken(data.token);
    if (!response.valid) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
