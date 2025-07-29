import Analysis from "../models/analysis.model.js";


export const getRoomData = async (req, res) => {
    try {
        const roomName = req.params.roomName;

        if (!roomName) {
            return res.status(400).json({ error: "Room name is required" });
        }

        const analysisData = await Analysis.findOne({ roomName: roomName });

        if (!analysisData) {
            return res.status(404).json({ error: "Room not found" });
        }

        res.json({ analysisData });
    } catch (error) {
        console.error("Error fetching room data:", error);
        res.status(500).json({ error: "Failed to fetch room data", details: error.message });
    }
};
