import BleManager from 'react-native-ble-manager';

// BLE UUIDs for Heart Rate Service
const HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID =
  '00002a37-0000-1000-8000-00805f9b34fb';

export interface BluetoothDevice {
  id: string;
  name: string;
  rssi: number;
}

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface HeartRateCallback {
  (heartRate: number): void;
}

export class BluetoothService {
  private static instance: BluetoothService;
  private connectedDeviceId: string | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private heartRateCallback: HeartRateCallback | null = null;
  private isMonitoring: boolean = false;
  private uploadInterval: ReturnType<typeof setInterval> | null = null;

  static getInstance(): BluetoothService {
    if (!BluetoothService.instance) {
      BluetoothService.instance = new BluetoothService();
    }
    return BluetoothService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await BleManager.start({showAlert: false});
      console.log('Bluetooth initialized');
    } catch (error) {
      console.error('Failed to initialize Bluetooth:', error);
      throw error;
    }
  }

  async checkBluetoothEnabled(): Promise<boolean> {
    try {
      const state = await BleManager.checkState();
      return state === 'on';
    } catch (error) {
      console.error('Error checking Bluetooth state:', error);
      return false;
    }
  }

  async scanForDevices(duration: number = 5000): Promise<BluetoothDevice[]> {
    try {
      const enabled = await this.checkBluetoothEnabled();
      if (!enabled) {
        throw new Error('Bluetooth is not enabled');
      }

      const devices: BluetoothDevice[] = [];
      const foundDevices = new Set<string>();

      // Start scan
      await BleManager.scan([], duration, true);

      // Listen for discovered devices
      const subscription = BleManager.addListener(
        'BleManagerDiscoverPeripheral',
        peripheral => {
          const deviceId = peripheral.id;
          if (!foundDevices.has(deviceId)) {
            foundDevices.add(deviceId);

            // Filter for Whoop devices or heart rate devices
            const name = peripheral.name || '';
            if (
              name.toUpperCase().includes('WHOOP') ||
              peripheral.advertising?.serviceUUIDs?.includes(
                HEART_RATE_SERVICE_UUID,
              )
            ) {
              devices.push({
                id: deviceId,
                name: name || 'Unknown Device',
                rssi: peripheral.rssi || 0,
              });
            }
          }
        },
      );

      // Wait for scan to complete
      await new Promise<void>(resolve => setTimeout(resolve, duration + 1000));

      // Remove listener
      subscription.remove();

      return devices;
    } catch (error) {
      console.error('Error scanning for devices:', error);
      throw error;
    }
  }

  async connect(deviceId: string): Promise<void> {
    try {
      if (
        this.connectionState === 'connected' &&
        this.connectedDeviceId === deviceId
      ) {
        return; // Already connected
      }

      this.connectionState = 'connecting';

      await BleManager.connect(deviceId);
      await BleManager.retrieveServices(deviceId);

      this.connectedDeviceId = deviceId;
      this.connectionState = 'connected';

      // Set up disconnect listener
      BleManager.addListener('BleManagerDisconnectPeripheral', peripheral => {
        if (peripheral.id === deviceId) {
          this.handleDisconnect();
        }
      });

      console.log('Connected to device:', deviceId);
    } catch (error) {
      this.connectionState = 'error';
      console.error('Error connecting to device:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectedDeviceId) {
      try {
        await this.stopHeartRateMonitoring();
        await BleManager.disconnect(this.connectedDeviceId);
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
    this.handleDisconnect();
  }

  private handleDisconnect(): void {
    this.connectedDeviceId = null;
    this.connectionState = 'disconnected';
    this.isMonitoring = false;
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }
  }

  async startHeartRateMonitoring(callback: HeartRateCallback): Promise<void> {
    if (!this.connectedDeviceId) {
      throw new Error('No device connected');
    }

    if (this.isMonitoring) {
      return; // Already monitoring
    }

    try {
      this.heartRateCallback = callback;
      this.isMonitoring = true;

      // Subscribe to heart rate notifications
      await BleManager.startNotification(
        this.connectedDeviceId,
        HEART_RATE_SERVICE_UUID,
        HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID,
      );

      // Set up notification listener
      BleManager.addListener(
        'BleManagerDidUpdateValueForCharacteristic',
        data => {
          console.log(
            `[BluetoothService] Notification received: peripheral=${data.peripheral}, characteristic=${data.characteristic}, expectedPeripheral=${this.connectedDeviceId}`,
          );
          if (
            data.peripheral === this.connectedDeviceId &&
            data.characteristic === HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID
          ) {
            const heartRate = this.parseHeartRate(data.value);
            console.log(
              '[BluetoothService] Parsed heart rate:',
              heartRate + ' bpm',
            );
            if (heartRate > 0 && heartRate < 300) {
              callback(heartRate);
            } else {
              console.log(
                `[BluetoothService] Heart rate out of range: ${heartRate}`,
              );
            }
          } else {
            console.log(
              '[BluetoothService] Notification ignored - not matching device/characteristic',
            );
          }
        },
      );

      // Also read initial value
      try {
        const data = await BleManager.read(
          this.connectedDeviceId,
          HEART_RATE_SERVICE_UUID,
          HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID,
        );
        const heartRate = this.parseHeartRate(data);
        if (heartRate > 0 && heartRate < 300) {
          callback(heartRate);
        }
      } catch (error) {
        // Read may not be supported, that's okay
        console.log('Read not supported, relying on notifications');
      }

      console.log(
        `[BluetoothService] Heart rate monitoring started for device: ${this.connectedDeviceId}`,
      );
    } catch (error) {
      this.isMonitoring = false;
      console.error('Error starting heart rate monitoring:', error);
      throw error;
    }
  }

  async stopHeartRateMonitoring(): Promise<void> {
    if (!this.isMonitoring || !this.connectedDeviceId) {
      return;
    }

    try {
      await BleManager.stopNotification(
        this.connectedDeviceId,
        HEART_RATE_SERVICE_UUID,
        HEART_RATE_MEASUREMENT_CHARACTERISTIC_UUID,
      );

      this.isMonitoring = false;
      this.heartRateCallback = null;

      if (this.uploadInterval) {
        clearInterval(this.uploadInterval);
        this.uploadInterval = null;
      }

      console.log('Heart rate monitoring stopped');
    } catch (error) {
      console.error('Error stopping heart rate monitoring:', error);
    }
  }

  private parseHeartRate(data: number[]): number {
    if (!data || data.length === 0) {
      return 0;
    }

    // Heart Rate Measurement format:
    // Byte 0: Flags (bit 0 = 1 means 16-bit, 0 means 8-bit)
    // Byte 1-2: Heart rate value

    if (data.length === 1) {
      return data[0];
    }

    const flags = data[0];
    // eslint-disable-next-line no-bitwise
    const is16Bit = (flags & 0x01) !== 0;

    if (is16Bit && data.length >= 3) {
      // 16-bit value, little-endian
      // eslint-disable-next-line no-bitwise
      return data[1] | (data[2] << 8);
    } else if (data.length >= 2) {
      // 8-bit value
      return data[1];
    }

    return data[0];
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }
}

export const bluetoothService = BluetoothService.getInstance();
