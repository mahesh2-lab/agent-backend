import Queue from "bull";
import { handleSingleFile } from "../services/evaluate.service.js";
import fs from "fs/promises";
import dotenv from "dotenv";
import { createToken } from "../services/token.service.js";
import connectDB from "../db/connection.js";
import { sendEmail } from "../services/email.service.js";

dotenv.config();

const { REDIS_HOST, REDIS_PORT, APP_URL } = process.env;

const LINK_PLACEHOLDER = "[placeholder link]";
const PASSWORD_PLACEHOLDER = "[password]";

const evaluateQueue = new Queue("evaluate", {
  redis: { port: REDIS_PORT || 6379, host: REDIS_HOST || "127.0.0.1" },
});

const handleEligibleCandidate = async (
  candidateDetails,
  jobDescription,
  result,
  is_eligible
) => {
  try {
    const tokenResponse = await createToken(
      candidateDetails.name,
      JSON.stringify(candidateDetails),
      JSON.stringify(jobDescription)
    );

    const joinlink = `${APP_URL || "frontend-three-wine-89.vercel.app"}/?id=${
      tokenResponse.id
    }`;

    const email = candidateDetails.email;
    const subject = result.response.communication.email_subject;

    if (!is_eligible) {
      let text = result.response.communication.email_body;
      const emailResponse = await sendEmail(email, subject, text);
      if (emailResponse.success) {
        console.log("Email sent successfully:", emailResponse.messageId);
      } else {
        console.error("Error sending email:", emailResponse.error);
      }
      return; 
    }

    let text = result.response.communication.email_body;
    text = text.replace(LINK_PLACEHOLDER, joinlink);
    text = text.replace(PASSWORD_PLACEHOLDER, tokenResponse.password);

    const emailResponse = await sendEmail(email, subject, text);

    if (emailResponse.success) {
      console.log("Email sent successfully:", emailResponse.messageId);
    } else {
      console.error("Error sending email:", emailResponse.error);
      // Decide if this should throw an error and fail the job
    }
  } catch (error) {
    console.error("Error handling eligible candidate:", error);
    throw error; // Re-throw to fail the job if token creation or email sending fails critically
  }
};

const processEvaluationJob = async (job) => {
  const { filePath, jobDescription } = job.data;
  console.log(`Processing job ${job.id} for file ${filePath}`);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const file = {
      path: filePath,
      buffer: fileBuffer,
    };

    const result = await handleSingleFile(file, jobDescription);

    const is_eligible = result.response.evaluation.is_eligible;
    const candidateDetails = result.response.candidate_profile;

    await handleEligibleCandidate(
      candidateDetails,
      jobDescription,
      result,
      is_eligible
    );
  } catch (err) {
    console.error(`Error processing evaluation job ${job.id}:`, err);
    throw err; // Throw error to fail the job
  } finally {
    // Clean up the uploaded file
    try {
      await fs.unlink(filePath);
      console.log(`Deleted file ${filePath}`);
    } catch (unlinkErr) {
      console.error(`Error deleting file ${filePath}:`, unlinkErr);
    }
  }
};

await connectDB();

evaluateQueue.process(processEvaluationJob);

console.log("Worker is listening for evaluation jobs...");
