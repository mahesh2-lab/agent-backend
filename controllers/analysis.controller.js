import {
  updateEntry,
  getEntryByRoomName,
  getRecentEntries,
} from "../services/db.service.js";
import { handleProcessTranscript } from "../services/evaluate.service.js";

export const receiveInterviewAnalysis = async (req, res) => {
  try {
    const {
      room_name,
      transcript_data,
      candidate_details,
      job_description,
      status = "completed",
    } = req.body;

    if (!room_name || !transcript_data) {
      return res.status(400).json({
        status: "error",
        message: "room_name and transcript_data are required",
      });
    }


    const analysis = await handleProcessTranscript(transcript_data);

    analysis["context"] = {
      candidate_details: candidate_details,
      job_description: job_description,
      room_name: room_name,
    };

    // Save analysis to database
    const dbData = {
      analysis: analysis,
      status: status,
    };

    const result = await updateEntry(room_name, dbData);

    if (!result.success) {
      console.error("❌ Error saving analysis to database:", result.error);
      return res.status(500).json({
        status: "error",
        message: "Failed to save analysis",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Analysis received",
    });
  } catch (error) {
    console.error(`❌ Error processing analysis: ${error}`);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

export const getRecentAnalyses = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

    const result = await getRecentEntries(limit);

    if (!result.success) {
      return res
        .status(500)
        .json({ status: "error", message: "Failed to fetch recent analyses" });
    }

    // Map results to parsed analysis and basic metadata
    const mapped = (result.data || []).map((doc) => {
      let parsed = null;
      try {
        parsed = doc.evaluationResult ? JSON.parse(doc.evaluationResult) : null;
      } catch (err) {
        parsed = doc.evaluationResult;
      }

      return {
        id: doc._id,
        name: doc.name,
        roomName: doc.roomName,
        candidateDetails: doc.candidateDetails,
        jobDescription: doc.jobDescription,
        status: doc.status,
        createdAt: doc.createdAt,
        analysis: parsed,
      };
    });

    return res.status(200).json({ status: "success", analyses: mapped });
  } catch (error) {
    console.error("❌ Error retrieving recent analyses:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

export const getInterviewAnalysis = async (req, res) => {
  try {
    const { room_name } = req.params;

    if (!room_name) {
      return res.status(400).json({
        status: "error",
        message: "room_name is required",
      });
    }

    // Wait up to 30 seconds for analysis data to be available
    const timeout = 30000; // 30 seconds in milliseconds
    const interval = 1000; // 1 second in milliseconds
    let waited = 0;

    while (waited < timeout) {
      const result = await getEntryByRoomName(room_name);

      if (result.success && result.data && result.data.analysis) {
        return res.status(200).json({
          status: "success",
          analysis: JSON.parse(result.data.analysis),
        });
      }

      // Wait for the interval before checking again
      await new Promise((resolve) => setTimeout(resolve, interval));
      waited += interval;
    }

    return res.status(404).json({
      status: "not_found",
      message: "No analysis found for this room after waiting",
    });
  } catch (error) {
    console.error(`❌ Error retrieving analysis: ${error}`);
    return res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};
