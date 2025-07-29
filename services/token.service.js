import { AccessToken } from "livekit-server-sdk";
import { Room, RoomServiceClient } from "livekit-server-sdk";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { createEntry } from "./db.service.js";
import { generatePassword, hashPassword } from "../utils/generate_password.js";

dotenv.config();

const roomService = new RoomServiceClient(
  process.env.LIVEKIT_URL,
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

const generate_room_name = async () => {
  const name = "room-" + String(uuidv4()).substring(0, 8);
  const rooms = await roomService.listRooms();
  const existingRoom = rooms.find((room) => room.name === name);
  if (existingRoom) {
    return await generate_room_name();
  }
  return name;
};

export const createToken = async (name, candidateDetails, jobDescription) => {
  try {
    let room = await generate_room_name();
    const password = generatePassword();

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: name,
        name: name,
        ttl: 30 * 60, // 30 minutes
      }
    );

    token.addGrant({
      roomJoin: true,
      room: room,
    });

    const finalToken = await token.toJwt();

    const response = await createEntry({
      name: name,
      candidateDetails: candidateDetails,
      jobDescription: jobDescription,
      roomName: room,
      token: finalToken,
      password: hashPassword(password),
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return {
      id: response.data._id,
      room: room,
      token: finalToken,
      password: password,
    };
  } catch (error) {
    console.error("Error creating token:", error);
    throw new Error("Failed to create token");
  }
};
