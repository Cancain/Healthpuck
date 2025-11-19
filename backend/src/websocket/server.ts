import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import jwt, { JwtPayload } from "jsonwebtoken";

import { getPatientContextForUser } from "../utils/patientContext";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

type WebSocketClient = {
  ws: WebSocket;
  userId: number;
  patientId: number;
  role: "patient" | "caregiver";
};

type HeartRateMessage = {
  type: "heart-rate-update";
  heartRate: number;
};

type SubscribeMessage = {
  type: "subscribe";
  patientId: number;
};

type PingMessage = {
  type: "ping";
};

type HeartRateBroadcast = {
  type: "heart-rate";
  heartRate: number;
  timestamp: number;
};

type WebSocketMessage = HeartRateMessage | SubscribeMessage | PingMessage;

const clients = new Map<WebSocket, WebSocketClient>();
const caregiversByPatient = new Map<number, Set<WebSocket>>();

function extractTokenFromCookies(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("hp_token="))
    ?.split("=")[1];
  return token || null;
}

async function authenticateWebSocket(req: IncomingMessage): Promise<{
  userId: number;
  patientId: number;
  role: "patient" | "caregiver";
} | null> {
  try {
    const cookieHeader = req.headers.cookie;
    const token = extractTokenFromCookies(cookieHeader);

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET as jwt.Secret) as JwtPayload | string;
    const userId = typeof decoded === "string" ? undefined : Number(decoded.sub);
    if (!userId) {
      return null;
    }

    const context = await getPatientContextForUser(userId);
    return {
      userId,
      patientId: context.patientId,
      role: context.role,
    };
  } catch (err) {
    console.error("[WebSocket] Authentication error:", err);
    return null;
  }
}

function broadcastToCaregivers(patientId: number, heartRate: number, timestamp: number) {
  const caregivers = caregiversByPatient.get(patientId);
  if (!caregivers || caregivers.size === 0) {
    return;
  }

  const message: HeartRateBroadcast = {
    type: "heart-rate",
    heartRate,
    timestamp,
  };

  const messageStr = JSON.stringify(message);
  caregivers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

export function setupWebSocketServer(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request: IncomingMessage, socket: any, head: Buffer) => {
    const auth = await authenticateWebSocket(request);
    if (!auth) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const client: WebSocketClient = {
        ws,
        userId: auth.userId,
        patientId: auth.patientId,
        role: auth.role,
      };

      clients.set(ws, client);

      if (auth.role === "caregiver") {
        if (!caregiversByPatient.has(auth.patientId)) {
          caregiversByPatient.set(auth.patientId, new Set());
        }
        caregiversByPatient.get(auth.patientId)!.add(ws);
      }

      ws.on("message", async (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());

          if (message.type === "heart-rate-update") {
            if (client.role !== "patient") {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Only patients can send heart rate updates",
                }),
              );
              return;
            }

            const heartRateMessage = message as HeartRateMessage;
            broadcastToCaregivers(client.patientId, heartRateMessage.heartRate, Date.now());
          } else if (message.type === "subscribe") {
            if (client.role !== "caregiver") {
              ws.send(JSON.stringify({ type: "error", message: "Only caregivers can subscribe" }));
              return;
            }

            const subscribeMessage = message as SubscribeMessage;
            if (subscribeMessage.patientId === client.patientId) {
              if (!caregiversByPatient.has(client.patientId)) {
                caregiversByPatient.set(client.patientId, new Set());
              }
              caregiversByPatient.get(client.patientId)!.add(ws);
            }
          } else if (message.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          }
        } catch (err) {
          console.error("[WebSocket] Error handling message:", err);
          ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        clients.delete(ws);
        caregiversByPatient.forEach((caregivers, patientId) => {
          caregivers.delete(ws);
          if (caregivers.size === 0) {
            caregiversByPatient.delete(patientId);
          }
        });
      });

      ws.on("error", (error) => {
        console.error("[WebSocket] Client error:", error);
        clients.delete(ws);
        caregiversByPatient.forEach((caregivers) => {
          caregivers.delete(ws);
        });
      });
    });
  });

  return wss;
}

export function broadcastHeartRateToCaregivers(
  patientId: number,
  heartRate: number,
  timestamp: number,
) {
  broadcastToCaregivers(patientId, heartRate, timestamp);
}
