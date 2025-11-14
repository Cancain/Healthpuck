const HEART_RATE_SERVICE_UUID = 0x180d;
const HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID = 0x2a37;

type BluetoothRemoteGATTCharacteristic = EventTarget & {
  startNotifications(): Promise<void>;
  stopNotifications(): Promise<void>;
  addEventListener(type: "characteristicvaluechanged", listener: (event: Event) => void): void;
  removeEventListener(type: "characteristicvaluechanged", listener: (event: Event) => void): void;
  value?: DataView;
};

type BluetoothRemoteGATTService = {
  getCharacteristic(characteristic: number): Promise<BluetoothRemoteGATTCharacteristic>;
};

type BluetoothRemoteGATTServer = {
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: number): Promise<BluetoothRemoteGATTService>;
  connected: boolean;
};

type BluetoothDevice = EventTarget & {
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(type: "gattserverdisconnected", listener: () => void): void;
};

type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice(options: {
      filters?: Array<{ services?: number[] }>;
      optionalServices?: number[];
    }): Promise<
      EventTarget & {
        gatt?: BluetoothRemoteGATTServer;
        addEventListener(type: "gattserverdisconnected", listener: () => void): void;
      }
    >;
  };
};

export interface WhoopBluetoothDevice {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  service: BluetoothRemoteGATTService;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

export class WhoopBluetoothManager {
  private static instance: WhoopBluetoothManager;
  private connectedDevice: WhoopBluetoothDevice | null = null;
  private heartRateCallback: ((heartRate: number) => void) | null = null;
  private mockMode: boolean = false;
  private mockInterval: ReturnType<typeof setInterval> | null = null;
  private mockHeartRate: number = 72;

  static getInstance(): WhoopBluetoothManager {
    if (!WhoopBluetoothManager.instance) {
      WhoopBluetoothManager.instance = new WhoopBluetoothManager();
    }
    return WhoopBluetoothManager.instance;
  }

  isSupported(): boolean {
    const nav = navigator as BluetoothNavigator;
    return typeof navigator !== "undefined" && nav.bluetooth !== undefined;
  }

  enableMockMode(): void {
    this.mockMode = true;
  }

  disableMockMode(): void {
    this.mockMode = false;
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  isMockMode(): boolean {
    return this.mockMode;
  }

  async connect(): Promise<WhoopBluetoothDevice> {
    if (this.mockMode) {
      this.mockHeartRate = 72;
      const mockDevice = {
        device: {} as BluetoothDevice,
        server: {} as BluetoothRemoteGATTServer,
        service: {} as BluetoothRemoteGATTService,
        characteristic: {} as BluetoothRemoteGATTCharacteristic,
      };
      this.connectedDevice = mockDevice;
      return mockDevice;
    }

    if (!this.isSupported() && !this.mockMode) {
      throw new Error("Bluetooth is not supported in this browser");
    }

    if (this.connectedDevice) {
      return this.connectedDevice;
    }

    try {
      const nav = navigator as BluetoothNavigator;
      if (!nav.bluetooth) {
        throw new Error("Bluetooth is not supported");
      }
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE_UUID] }],
        optionalServices: [HEART_RATE_SERVICE_UUID],
      });

      if (!device.gatt) {
        throw new Error("GATT server not available");
      }

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(HEART_RATE_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(
        HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID,
      );

      this.connectedDevice = {
        device,
        server,
        service,
        characteristic,
      };

      device.addEventListener("gattserverdisconnected", () => {
        this.handleDisconnect();
      });

      return this.connectedDevice;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "NotFoundError") {
          throw new Error(
            "No Whoop device found. Make sure your device is nearby and broadcasting heart rate.",
          );
        }
        if (error.name === "SecurityError") {
          throw new Error("Bluetooth permission denied. Please allow Bluetooth access.");
        }
        throw error;
      }
      throw new Error("Failed to connect to Whoop device");
    }
  }

  async startHeartRateMonitoring(callback: (heartRate: number) => void): Promise<void> {
    if (!this.connectedDevice) {
      throw new Error("Device not connected. Call connect() first.");
    }

    this.heartRateCallback = callback;

    if (this.mockMode) {
      this.startMockHeartRate();
      return;
    }

    await this.connectedDevice.characteristic.startNotifications();
    this.connectedDevice.characteristic.addEventListener(
      "characteristicvaluechanged",
      this.handleHeartRateUpdate.bind(this),
    );
  }

  private startMockHeartRate(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
    }

    this.mockHeartRate = 65 + Math.floor(Math.random() * 20);

    this.mockInterval = setInterval(() => {
      const change = Math.floor(Math.random() * 7) - 3;
      this.mockHeartRate = Math.max(50, Math.min(180, this.mockHeartRate + change));

      if (this.heartRateCallback) {
        this.heartRateCallback(this.mockHeartRate);
      }
    }, 1000);
  }

  async stopHeartRateMonitoring(): Promise<void> {
    if (this.mockMode) {
      if (this.mockInterval) {
        clearInterval(this.mockInterval);
        this.mockInterval = null;
      }
      this.heartRateCallback = null;
      return;
    }

    if (this.connectedDevice?.characteristic) {
      try {
        await this.connectedDevice.characteristic.stopNotifications();
        this.connectedDevice.characteristic.removeEventListener(
          "characteristicvaluechanged",
          this.handleHeartRateUpdate.bind(this),
        );
      } catch (error) {
        console.error("Error stopping notifications:", error);
      }
    }
    this.heartRateCallback = null;
  }

  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      await this.stopHeartRateMonitoring();
      if (!this.mockMode && this.connectedDevice.server.connected) {
        this.connectedDevice.server.disconnect();
      }
      this.connectedDevice = null;
    }
  }

  isConnected(): boolean {
    if (this.mockMode) {
      return this.connectedDevice !== null;
    }
    return this.connectedDevice !== null && this.connectedDevice.server.connected;
  }

  private handleHeartRateUpdate(event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;

    const dataView = target.value;
    let heartRate: number;

    const flags = dataView.getUint8(0);
    const is16Bit = flags & 0x01;

    if (is16Bit) {
      heartRate = dataView.getUint16(1, true);
    } else {
      heartRate = dataView.getUint8(1);
    }

    if (this.heartRateCallback && heartRate > 0 && heartRate < 300) {
      this.heartRateCallback(heartRate);
    }
  }

  private handleDisconnect(): void {
    this.connectedDevice = null;
    this.heartRateCallback = null;
  }
}

export const whoopBluetooth = WhoopBluetoothManager.getInstance();
