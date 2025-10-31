import Analysis from "../models/analysis.model.js";

export const createEntry = async (data) => {
  try {
    const {
      name,
      candidateDetails,
      jobDescription,
      roomName,
      token,
      password,
      evaluationResult,
    } = data;

    if (
      !name ||
      !candidateDetails ||
      !jobDescription ||
      !roomName ||
      !token ||
      !password
    ) {
      throw new Error("All fields are required");
    }

    const newdata = Analysis({
      name: name,
      candidateDetails: candidateDetails,
      jobDescription: jobDescription,
      roomName: roomName,
      token: token,
      password: password,
      evaluationResult: evaluationResult,
    });

    const savedData = await newdata.save();

    if (savedData) {
      return { success: true, data: savedData };
    }
  } catch (error) {
    console.error("Error in createEntry:", error.message);
    return { success: false, error: error.message };
  }
};

export const updateEntry = async (roomName, analysisData) => {
  try {
    const updatedData = await Analysis.findOneAndUpdate(
      {
        roomName: roomName,
      },
      {
        $set: {
          analysis: JSON.stringify(analysisData.analysis),
          status: analysisData.status,
        },
      },
      { new: true }
    );
    return { success: true, data: updatedData };
  } catch (error) {
    console.error("Error in updateEntry:", error.message);
    return { success: false, error: error.message };
  }
};

export const getEntryByRoomName = async (roomName) => {
  try {
    const data = await Analysis.findOne({ roomName: roomName });

    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, error: "No entry found for this room" };
    }
  } catch (error) {
    console.error("Error in getEntryByRoomName:", error.message);
    return { success: false, error: error.message };
  }
};

export const getRecentEntries = async (limit = 10) => {
  try {
    const l = parseInt(limit, 10) || 10;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    // Return entries from today that have an analysis saved, newest first
    const data = await Analysis.find({ createdAt: { $gte: startOfToday } })
      .sort({ createdAt: -1 })
      .limit(l);

    return { success: true, data };
  } catch (error) {
    console.error("Error in getRecentEntries:", error.message);
    return { success: false, error: error.message };
  }
};
