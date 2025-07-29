import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import path from "path";
import { config } from "dotenv"
import { fileURLToPath } from "url";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

export async function handleSingleFile(file, jobDescription) {
  const prompt = fs.readFileSync(
    path.join(__dirname, "../utils/PROMPT.txt"),
    "utf8"
  );

  const contents = [
    { text: prompt.replace("{{job_description}}", jobDescription) },
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: Buffer.from(fs.readFileSync(file.path)).toString("base64"),
      },
    },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents,
  });

  const jsonMatch = response.text.match(/```json\s*([\s\S]*?)\s*```/);

  const finalResponse = jsonMatch
    ? JSON.parse(jsonMatch[1])
    : { error: "No valid JSON response found" };

    
  return {
    path: file.path,
    response: finalResponse,
  };
}
