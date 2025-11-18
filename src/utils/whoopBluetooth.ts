const HEART_RATE_SERVICE_UUID = 0x180d;
const HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID = 0x2a37;
const HEART_RATE_CONTROL_POINT_UUID = 0x2a39;

function uuid16to128(uuid16: number): string {
  return `0000${uuid16.toString(16).padStart(4, "0")}-0000-1000-8000-00805f9b34fb`;
}

type BluetoothRemoteGATTCharacteristic = EventTarget & {
  startNotifications(): Promise<void>;
  stopNotifications(): Promise<void>;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  getDescriptors(): Promise<BluetoothRemoteGATTDescriptor[]>;
  addEventListener(type: "characteristicvaluechanged", listener: (event: Event) => void): void;
  removeEventListener(type: "characteristicvaluechanged", listener: (event: Event) => void): void;
  value?: DataView;
  uuid: string;
};

type BluetoothRemoteGATTDescriptor = {
  uuid: string;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
};

type BluetoothRemoteGATTService = {
  getCharacteristic(characteristic: number | string): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
  uuid: string;
};

type BluetoothRemoteGATTServer = {
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: number | string): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
  connected: boolean;
};

type BluetoothDevice = EventTarget & {
  gatt?: BluetoothRemoteGATTServer;
  name?: string;
  addEventListener(type: "gattserverdisconnected", listener: () => void): void;
};

type BluetoothNavigator = Navigator & {
  bluetooth?: {
    requestDevice(options: {
      filters?: Array<{ services?: (number | string)[]; name?: string; namePrefix?: string }>;
      acceptAllDevices?: boolean;
      optionalServices?: (number | string)[];
    }): Promise<
      EventTarget & {
        gatt?: BluetoothRemoteGATTServer;
        name?: string;
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
  private notificationsStarted: boolean = false;
  private heartRateUpdateHandler: ((event: Event) => void) | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private pollingEnabled: boolean = true;

  static getInstance(): WhoopBluetoothManager {
    if (!WhoopBluetoothManager.instance) {
      WhoopBluetoothManager.instance = new WhoopBluetoothManager();
    }
    return WhoopBluetoothManager.instance;
  }

  isSupported(): boolean {
    if (typeof navigator === "undefined") {
      return false;
    }

    try {
      const nav = navigator as BluetoothNavigator;
      const hasBluetooth = "bluetooth" in nav && nav.bluetooth !== undefined;

      if (hasBluetooth && nav.bluetooth) {
        return typeof nav.bluetooth.requestDevice === "function";
      }

      return false;
    } catch (error) {
      return false;
    }
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

    const nav = navigator as BluetoothNavigator;
    if (!nav.bluetooth) {
      throw new Error("Bluetooth is not supported");
    }

    let device: BluetoothDevice;
    let server: BluetoothRemoteGATTServer;
    let service: BluetoothRemoteGATTService;
    let characteristic: BluetoothRemoteGATTCharacteristic;

    try {
      try {
        device = (await nav.bluetooth.requestDevice({
          filters: [{ namePrefix: "WHOOP" }],
          optionalServices: [HEART_RATE_SERVICE_UUID, "0000180d-0000-1000-8000-00805f9b34fb"],
        })) as BluetoothDevice;
      } catch (nameError) {
        try {
          device = (await nav.bluetooth.requestDevice({
            filters: [{ services: [HEART_RATE_SERVICE_UUID] }],
            optionalServices: [HEART_RATE_SERVICE_UUID, "0000180d-0000-1000-8000-00805f9b34fb"],
          })) as BluetoothDevice;
        } catch (serviceError) {
          device = (await nav.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [HEART_RATE_SERVICE_UUID, "0000180d-0000-1000-8000-00805f9b34fb"],
          })) as BluetoothDevice;
        }
      }

      if (!device.gatt) {
        throw new Error("GATT server not available");
      }

      server = await device.gatt.connect();

      try {
        const services = await server.getPrimaryServices();

        try {
          service = await server.getPrimaryService(HEART_RATE_SERVICE_UUID);
        } catch (e) {
          try {
            service = await server.getPrimaryService(uuid16to128(HEART_RATE_SERVICE_UUID));
          } catch (e2) {
            const heartRateService = services.find(
              (s) =>
                s.uuid.toLowerCase().includes("180d") ||
                s.uuid.toLowerCase().includes("heart") ||
                s.uuid.toLowerCase().includes("hr"),
            );
            if (heartRateService) {
              service = heartRateService;
            } else {
              if (services.length > 0) {
                service = services[0];
              } else {
                throw new Error("No services found on device");
              }
            }
          }
        }

        try {
          characteristic = await service.getCharacteristic(
            HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID,
          );
        } catch (e) {
          try {
            characteristic = await service.getCharacteristic(
              uuid16to128(HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID),
            );
          } catch (e2) {
            const characteristics = await service.getCharacteristics();

            const hrChar = characteristics.find(
              (c) =>
                c.uuid.toLowerCase().includes("2a37") ||
                c.uuid.toLowerCase().includes("heart") ||
                c.uuid.toLowerCase().includes("measurement"),
            );
            if (hrChar) {
              characteristic = hrChar;
            } else if (characteristics.length > 0) {
              characteristic = characteristics[0];
            } else {
              throw new Error("No characteristics found in service");
            }
          }
        }
      } catch (discoveryError) {
        console.error("Service discovery error:", discoveryError);
        service = await server.getPrimaryService(HEART_RATE_SERVICE_UUID);
        characteristic = await service.getCharacteristic(
          HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID,
        );
      }

      this.connectedDevice = {
        device,
        server,
        service,
        characteristic,
      };

      device.addEventListener("gattserverdisconnected", () => {
        this.handleDisconnect();
      });

      try {
        const allCharacteristics = await service.getCharacteristics();

        const controlPoint = allCharacteristics.find(
          (c) =>
            c.uuid
              .toLowerCase()
              .includes(uuid16to128(HEART_RATE_CONTROL_POINT_UUID).toLowerCase()) ||
            c.uuid.toLowerCase().includes("2a39") ||
            c.uuid.toLowerCase().includes("control"),
        );
        if (controlPoint) {
          try {
            const enableValue = new Uint8Array([0x01]);
            await controlPoint.writeValue(enableValue);

            await new Promise((resolve) => setTimeout(resolve, 500));

            try {
              await controlPoint.writeValue(enableValue);
            } catch (e) {
              // Second write may fail, which is normal
            }
          } catch (error) {
            try {
              const disableValue = new Uint8Array([0x00]);
              await controlPoint.writeValue(disableValue);
              await new Promise((resolve) => setTimeout(resolve, 200));
              const enableValue = new Uint8Array([0x01]);
              await controlPoint.writeValue(enableValue);
            } catch (e2) {
              // Alternative write sequence failed
            }
          }
        }
      } catch (error) {
        // Error checking for control point
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      return this.connectedDevice;
    } catch (error) {
      console.error("Connection error:", error);
      if (error instanceof Error) {
        if (error.name === "NotFoundError") {
          throw new Error(
            "No Whoop device found. Make sure your device is nearby, powered on, and in pairing mode.",
          );
        }
        if (error.name === "SecurityError") {
          throw new Error("Bluetooth permission denied. Please allow Bluetooth access.");
        }
        if (error.message.includes("GATT")) {
          throw new Error(
            "Failed to access device services. The device may not support heart rate monitoring or may require pairing first.",
          );
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

    if (!this.mockMode && this.connectedDevice.server && !this.connectedDevice.server.connected) {
      throw new Error("GATT server is not connected. Please reconnect to the device.");
    }

    if (this.heartRateUpdateHandler) {
      this.connectedDevice.characteristic.removeEventListener(
        "characteristicvaluechanged",
        this.heartRateUpdateHandler,
      );
      this.heartRateUpdateHandler = null;
    }

    try {
      if (this.notificationsStarted) {
        try {
          await this.connectedDevice.characteristic.stopNotifications();
        } catch (e) {
          // Ignore errors when stopping
        }
        this.notificationsStarted = false;
      }

      await this.connectedDevice.characteristic.startNotifications();
      this.notificationsStarted = true;
    } catch (error) {
      console.error("[WhoopBluetooth] Error starting notifications:", error);
      this.notificationsStarted = false;
      throw error;
    }

    this.heartRateUpdateHandler = this.handleHeartRateUpdate.bind(this);
    this.connectedDevice.characteristic.addEventListener(
      "characteristicvaluechanged",
      this.heartRateUpdateHandler,
    );

    if (this.pollingEnabled && !this.mockMode) {
      try {
        const value = await this.connectedDevice.characteristic.readValue();
        if (value && value.byteLength > 0) {
          const mockEvent = {
            target: { value: value } as BluetoothRemoteGATTCharacteristic,
          } as unknown as Event;
          this.handleHeartRateUpdate(mockEvent);
        }
        this.startPolling();
      } catch (error) {
        // Read not supported, rely only on notifications
      }
    }
  }

  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(async () => {
      if (!this.connectedDevice || this.mockMode) {
        return;
      }

      if (!this.connectedDevice.server.connected) {
        this.stopPolling();
        return;
      }

      try {
        const value = await this.connectedDevice.characteristic.readValue();
        if (value && value.byteLength > 0) {
          const mockEvent = {
            target: { value: value } as BluetoothRemoteGATTCharacteristic,
          } as unknown as Event;
          this.handleHeartRateUpdate(mockEvent);
        }
      } catch (error) {
        // Polling read failed, stop polling and rely on notifications only
        this.stopPolling();
      }
    }, 1000);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
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
    this.stopPolling();

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
        if (this.heartRateUpdateHandler) {
          this.connectedDevice.characteristic.removeEventListener(
            "characteristicvaluechanged",
            this.heartRateUpdateHandler,
          );
          this.heartRateUpdateHandler = null;
        }
        if (this.notificationsStarted) {
          await this.connectedDevice.characteristic.stopNotifications();
          this.notificationsStarted = false;
        }
      } catch (error) {
        console.error("Error stopping notifications:", error);
      }
    }
    this.heartRateCallback = null;
  }

  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      await this.stopHeartRateMonitoring();
      if (!this.mockMode && this.connectedDevice.server && this.connectedDevice.server.connected) {
        try {
          this.connectedDevice.server.disconnect();
        } catch (error) {
          // Ignore disconnect errors
        }
      }
      this.connectedDevice = null;
      this.notificationsStarted = false;
    }
  }

  isConnected(): boolean {
    if (this.mockMode) {
      return this.connectedDevice !== null;
    }
    return this.connectedDevice !== null && this.connectedDevice.server.connected;
  }

  private handleHeartRateUpdate(event: Event): void {
    if (!this.heartRateCallback) {
      return;
    }

    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target || !target.value) {
      console.warn("[WhoopBluetooth] Heart rate update received but no value data");
      return;
    }

    try {
      const dataView = target.value;
      const dataLength = dataView.byteLength;

      if (dataLength < 1) {
        console.warn("[WhoopBluetooth] Heart rate data too short:", dataLength);
        return;
      }

      let heartRate: number;
      console.log("dataView", dataView);

      if (dataLength === 1) {
        heartRate = dataView.getUint8(0);
      } else {
        const flags = dataView.getUint8(0);
        const is16Bit = flags & 0x01;

        if (is16Bit && dataLength >= 3) {
          heartRate = dataView.getUint16(1, true);
        } else if (dataLength >= 2) {
          heartRate = dataView.getUint8(1);
        } else {
          heartRate = dataView.getUint8(0);
        }
      }

      if (heartRate >= 0 && heartRate < 300) {
        this.heartRateCallback(heartRate);
      } else {
        console.warn("[WhoopBluetooth] Invalid heart rate value:", heartRate);
      }
    } catch (error) {
      console.error("[WhoopBluetooth] Error parsing heart rate data:", error);
    }
  }

  private handleDisconnect(): void {
    this.stopPolling();
    this.connectedDevice = null;
    this.heartRateCallback = null;
    this.notificationsStarted = false;
    this.heartRateUpdateHandler = null;
  }
}

export const whoopBluetooth = WhoopBluetoothManager.getInstance();
