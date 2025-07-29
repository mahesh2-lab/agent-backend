import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  candidateDetails: {
    type: String,
    required: true,
  },
  jobDescription: {
    type: String,
    required: true,
  },
  roomName: {
    type: String,
    required: true,
  },
  analysis: {
    type: String,
    required: false,
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  token: {
    type: String,
    required: false,
  },
  password: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Analysis = mongoose.model("Analysis", analysisSchema);

export default Analysis;
