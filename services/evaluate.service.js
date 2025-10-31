import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import * as fs from "fs";
import path from "path";
import { config } from "dotenv";
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
        mimeType: "application/pdf",
        data: Buffer.from(fs.readFileSync(file.path)).toString("base64"),
      },
    },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
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

export async function handleProcessTranscript(transcriptData) {
  const prompt = `
You are a highly skilled AI recruitment analyst trained in behavioral psychology, technical evaluation, and fair-hiring practices.
Your task is to analyze a structured interview transcript provided in JSON format and generate an objective, bias-free, and role-aligned hiring report in JSON format.
Use best practices in recruitment to evaluate the candidate’s communication, domain expertise, confidence, problem-solving ability, soft skills, and technical depth.
Do not penalize for language fluency or grammar if the candidate demonstrates strong technical understanding or clear problem-solving ability.

Input JSON Format:
{
  "items": [ 
    { "id": "...", "type": "message", "role": "assistant" | "user", "content": ["..."], "interrupted": true | false } 
  ]
}
Output JSON Format:
{
  "candidateOverview": {
    "candidateName": "<Candidate Name>",
    "roleApplied": "<Job Title>",
    "communicationSkills": 0-10,
    "confidenceLevel": 0-10,
    "domainKnowledge": 0-10,
    "problemSolvingSkills": 0-10,
    "culturalFit": ""
  },
  "interviewStatistics": {
    "totalQuestionsAsked": 0,
    "totalCandidateResponses": 0,
    "estimatedDurationMinutes": 0,
    "candidateTalkRatioPercent": 0,
    "technicalToBehavioralRatio": "",
    "keywordsMentioned": [],
    "positiveIndicators": [],
    "negativeIndicators": []
  },
  "behavioralAnalysis": {
    "leadership": "",
    "communicationClarity": "",
    "adaptability": "",
    "teamCollaboration": "",
    "emotionalIntelligence": ""
  },
  "technicalEvaluation": {
    "mainChallengesDiscussed": [],
    "solutionsProposed": [],
    "technicalDepth": "",
    "alignmentWithRoleRequirements": "",
    "toolsOrTechnologiesMentioned": []
  },
  "biasCheck": {
    "grammarFluencyIssues": false,
    "didAffectScoring": false,
    "notes": ""
  },
  "hiringRecommendation": {
    "status": "",
    "reasoning": ""
  },
  "improvementSuggestions": [
    "",
    ""
  ],
  "sentimentToneAnalysis": {
    "overallSentiment": "",
    "toneBreakdown": {
      "confidence": "",
      "hesitation": "",
      "enthusiasm": "",
      "engagement": ""
    },
    "languageObservations": []
  },
  "overallSuitabilityScore": {
    "combinedScoreOutOf10": 0,
    "comparisonToPreviousRounds": "",
    "finalVerdict": ""
  }
}
`;


  // Build the user message combining the prompt and the transcript
  const userMessage = `${prompt}\nInterview transcript data:\n${JSON.stringify(
    transcriptData
  )}`;

  // Create OpenAI client pointed at OpenRouter (config via env vars)
  const openai = new OpenAI({
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY
  });

  // Create chat completion using OpenRouter model (default to an OSS model if env not set)
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";

  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: userMessage }],
    temperature: 0.2,
  });

  // Extract text from response (support different shapes)
  const rawText =
    completion?.choices?.[0]?.message?.content ||
    completion?.choices?.[0]?.message ||
    completion?.choices?.[0]?.text ||
    "";

  // Try to extract a ```json block and parse safely
  const jsonMatch = String(rawText).match(/```json\s*([\s\S]*?)\s*```/);
  let finalResponse;
  try {
    if (jsonMatch) {
      finalResponse = JSON.parse(jsonMatch[1]);
    } else {
      // If there's no fenced json, attempt to parse the whole text
      finalResponse = JSON.parse(rawText);
    }
  } catch (err) {
    finalResponse = { error: "No valid JSON response found", rawText };
  }

  return { response: finalResponse };
}
