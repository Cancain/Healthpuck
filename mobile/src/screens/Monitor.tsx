import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {bluetoothService, BluetoothDevice} from '../services/bluetooth';
import {apiService} from '../services/api';
import {authService} from '../services/auth';
import {backgroundService} from '../services/backgroundService';

interface MonitorScreenProps {
  onLogout: () => void;
}

export const MonitorScreen: React.FC<MonitorScreenProps> = ({onLogout}) => {
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [connectionState, setConnectionState] =
    useState<string>('disconnected');
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(
    null,
  );
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [uploadQueueSize, setUploadQueueSize] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!mounted) {
        return;
      }
      await initializeBluetooth();
      loadUser();
      checkUploadQueue();
    };

    init();

    // Check upload queue periodically
    const queueInterval = setInterval(checkUploadQueue, 5000);

    return () => {
      mounted = false;
      clearInterval(queueInterval);
      if (isMonitoring) {
        bluetoothService.stopHeartRateMonitoring();
        backgroundService.stopService().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUser = async () => {
    const userData = await authService.getUser();
    setUser(userData);
  };

  const checkUploadQueue = () => {
    const queueSize = apiService.getOfflineQueueSize();
    setUploadQueueSize(queueSize);
  };

  const initializeBluetooth = async () => {
    try {
      await bluetoothService.initialize();
      const enabled = await bluetoothService.checkBluetoothEnabled();
      if (!enabled) {
        Alert.alert(
          'Bluetooth Disabled',
          'Please enable Bluetooth to use this app',
          [{text: 'OK'}],
        );
      }
      updateConnectionState();
    } catch (error: any) {
      Alert.alert('Error', `Failed to initialize Bluetooth: ${error.message}`);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return (
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] ===
          PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] ===
          PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const scanForDevices = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Bluetooth permissions are required to scan for devices',
      );
      return;
    }

    setIsScanning(true);
    setDevices([]);

    try {
      const foundDevices = await bluetoothService.scanForDevices(5000);
      setDevices(foundDevices);

      if (foundDevices.length === 0) {
        Alert.alert(
          'No Devices Found',
          'No Whoop devices found. Make sure your device is nearby and powered on.',
        );
      }
    } catch (error: any) {
      Alert.alert('Scan Error', error.message || 'Failed to scan for devices');
    } finally {
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      setConnectionState('connecting');
      await bluetoothService.connect(device.id);
      setSelectedDevice(device);
      updateConnectionState();
      Alert.alert('Connected', `Connected to ${device.name}`);
    } catch (error: any) {
      setConnectionState('error');
      Alert.alert(
        'Connection Failed',
        error.message || 'Failed to connect to device',
      );
      updateConnectionState();
    }
  };

  const startMonitoring = async () => {
    if (!bluetoothService.isConnected()) {
      Alert.alert('Not Connected', 'Please connect to a device first');
      return;
    }

    try {
      // Start background service for continuous monitoring
      try {
        await backgroundService.startService();
      } catch (error) {
        console.warn('Failed to start background service:', error);
        // Continue anyway - monitoring will still work in foreground
      }

      const handleHeartRate = async (hr: number) => {
        setHeartRate(hr);

        // Update background service notification
        try {
          await backgroundService.updateNotification(`${hr}`);
        } catch (error) {
          // Ignore notification update errors
        }

        // Upload to backend
        try {
          await apiService.uploadHeartRate(hr, 'bluetooth');
          checkUploadQueue();
        } catch (error) {
          console.error('Failed to upload heart rate:', error);
          checkUploadQueue();
        }
      };

      await bluetoothService.startHeartRateMonitoring(handleHeartRate);
      setIsMonitoring(true);
      updateConnectionState();
    } catch (error: any) {
      Alert.alert('Error', `Failed to start monitoring: ${error.message}`);
    }
  };

  const stopMonitoring = async () => {
    try {
      await bluetoothService.stopHeartRateMonitoring();
      setIsMonitoring(false);
      updateConnectionState();

      // Stop background service
      try {
        await backgroundService.stopService();
      } catch (error) {
        console.warn('Failed to stop background service:', error);
      }
    } catch (error: any) {
      console.error('Error stopping monitoring:', error);
    }
  };

  const disconnect = async () => {
    try {
      await stopMonitoring();
      await bluetoothService.disconnect();
      setSelectedDevice(null);
      setHeartRate(null);
      updateConnectionState();
    } catch (error: any) {
      console.error('Error disconnecting:', error);
    }
  };

  const updateConnectionState = () => {
    const state = bluetoothService.getConnectionState();
    setConnectionState(state);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await stopMonitoring();
          await disconnect();
          await authService.logout();
          onLogout();
        },
      },
    ]);
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return '#4CAF50';
      case 'connecting':
        return '#FF9800';
      case 'error':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Healthpuck</Text>
          {user && <Text style={styles.headerSubtitle}>{user.name}</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutButton}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Connection Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusIndicator,
                {backgroundColor: getConnectionStatusColor()},
              ]}
            />
            <Text style={styles.statusText}>
              {connectionState.charAt(0).toUpperCase() +
                connectionState.slice(1)}
            </Text>
          </View>
          {selectedDevice && (
            <Text style={styles.deviceName}>{selectedDevice.name}</Text>
          )}
          {uploadQueueSize > 0 && (
            <Text style={styles.queueText}>
              {uploadQueueSize} reading(s) queued for upload
            </Text>
          )}
        </View>

        {/* Heart Rate Display */}
        <View style={styles.heartRateCard}>
          {heartRate !== null ? (
            <>
              <Text style={styles.heartRateValue}>{heartRate}</Text>
              <Text style={styles.heartRateLabel}>BPM</Text>
            </>
          ) : (
            <Text style={styles.noDataText}>No heart rate data</Text>
          )}
        </View>

        {/* Device Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devices</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={scanForDevices}
            disabled={isScanning}>
            {isScanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Scan for Devices</Text>
            )}
          </TouchableOpacity>

          {devices.length > 0 && (
            <View style={styles.deviceList}>
              {devices.map(device => (
                <TouchableOpacity
                  key={device.id}
                  style={[
                    styles.deviceItem,
                    selectedDevice?.id === device.id &&
                      styles.deviceItemSelected,
                  ]}
                  onPress={() => connectToDevice(device)}>
                  <Text style={styles.deviceItemName}>{device.name}</Text>
                  <Text style={styles.deviceItemRssi}>RSSI: {device.rssi}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Monitoring Controls */}
        {bluetoothService.isConnected() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monitoring</Text>
            {!isMonitoring ? (
              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={startMonitoring}>
                <Text style={styles.buttonText}>Start Monitoring</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.buttonDanger}
                onPress={stopMonitoring}>
                <Text style={styles.buttonText}>Stop Monitoring</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={disconnect}>
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  queueText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 8,
  },
  heartRateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  heartRateValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#F44336',
  },
  heartRateLabel: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  noDataText: {
    fontSize: 18,
    color: '#999',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDanger: {
    backgroundColor: '#F44336',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: '#9E9E9E',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceList: {
    marginTop: 12,
  },
  deviceItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deviceItemSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  deviceItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceItemRssi: {
    fontSize: 12,
    color: '#666',
  },
});
