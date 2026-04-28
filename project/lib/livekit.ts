import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

type LiveKitConfig = {
  url: string;
  apiKey: string;
  apiSecret: string;
};

function readRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getLiveKitConfig(): LiveKitConfig {
  return {
    url: readRequiredEnv("LIVEKIT_URL"),
    apiKey: readRequiredEnv("LIVEKIT_API_KEY"),
    apiSecret: readRequiredEnv("LIVEKIT_API_SECRET"),
  };
}

export function getLiveKitServerUrl() {
  return getLiveKitConfig().url;
}

export function getLiveKitRoomService() {
  const { url, apiKey, apiSecret } = getLiveKitConfig();
  return new RoomServiceClient(url, apiKey, apiSecret);
}

export async function createLiveKitParticipantToken({
  identity,
  name,
  roomName,
  metadata,
  canPublish = true,
}: {
  identity: string;
  name: string;
  roomName: string;
  metadata?: Record<string, unknown>;
  canPublish?: boolean;
}) {
  const { apiKey, apiSecret } = getLiveKitConfig();

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    ttl: "2h",
  });

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
  });

  return token.toJwt();
}

export async function ensureLiveKitRoom(roomName: string) {
  const roomService = getLiveKitRoomService();

  const existingRooms = await roomService.listRooms([roomName]);
  if (existingRooms.some((room) => room.name === roomName)) {
    return;
  }

  await roomService.createRoom({
    name: roomName,
    emptyTimeout: 10 * 60,
    maxParticipants: 2,
  });
}
