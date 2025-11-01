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

export const getRecentEntries = async () => {
  try {
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    // Return entries from today that have an analysis saved, newest first
    const data = await Analysis.find({ createdAt: { $gte: startOfToday } })
      .sort({ createdAt: -1 })

    return { success: true, data };
  } catch (error) {
    console.error("Error in getRecentEntries:", error.message);
    return { success: false, error: error.message };
  }
};

export const getAllEntries = async (page = 1, limit = 10, searchQuery = "") => {
  try {
    const query = searchQuery
      ? { $text: { $search: searchQuery } }
      : {};

    const data = await Analysis.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Analysis.countDocuments(query);

    return { success: true, data, total };
  } catch (error) {
    console.error("Error in getAllEntries:", error.message);
    return { success: false, error: error.message };
  }
};
