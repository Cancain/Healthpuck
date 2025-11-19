type HeartRateMessage = {
  type: "heart-rate";
  heartRate: number;
  timestamp: number;
};

type ErrorMessage = {
  type: "error";
  message: string;
};

type WebSocketMessage = HeartRateMessage | ErrorMessage;

type HeartRateCallback = (heartRate: number, timestamp: number) => void;

class HeartRateWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  private callbacks: Set<HeartRateCallback> = new Set();
  private apiBase: string;

  constructor(apiBase: string = process.env.REACT_APP_API_URL || "http://localhost:3001") {
    const url = new URL(apiBase);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    this.apiBase = url.toString().replace(/\/$/, "");
  }

  connect(patientId: number, role: "patient" | "caregiver"): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        const wsUrl = this.apiBase;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          if (role === "caregiver") {
            this.ws?.send(JSON.stringify({ type: "subscribe", patientId }));
          }

          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);

            if (message.type === "heart-rate") {
              this.callbacks.forEach((callback) => {
                callback(message.heartRate, message.timestamp);
              });
            } else if (message.type === "error") {
              console.error("[HeartRateWebSocket] Server error:", message.message);
            }
          } catch (err) {
            console.error("[HeartRateWebSocket] Error parsing message:", err);
          }
        };

        this.ws.onerror = (error) => {
          console.error("[HeartRateWebSocket] WebSocket error:", error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnecting = false;
          this.stopHeartbeat();
          this.attemptReconnect(patientId, role);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  sendHeartRate(heartRate: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "heart-rate-update", heartRate }));
    } else {
      console.warn("[HeartRateWebSocket] Cannot send heart rate: WebSocket not connected");
    }
  }

  onHeartRate(callback: HeartRateCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.callbacks.clear();
  }

  private attemptReconnect(patientId: number, role: "patient" | "caregiver"): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[HeartRateWebSocket] Max reconnection attempts reached");
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
      this.connect(patientId, role).catch((err) => {
        console.error("[HeartRateWebSocket] Reconnection failed:", err);
      });
    }, this.reconnectDelay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const heartRateWebSocket = new HeartRateWebSocketClient();
