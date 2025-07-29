import { updateEntry, getEntryByRoomName } from "../services/db.service.js";

export const receiveInterviewAnalysis = async (req, res) => {
  try {
    const { room_name, analysis, status = "completed" } = req.body;

    if (!room_name || !analysis) {
      return res.status(400).json({
        status: "error",
        message: "room_name and analysis are required",
      });
    }

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
