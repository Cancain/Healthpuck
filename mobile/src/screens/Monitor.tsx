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
          'Bluetooth inaktiverat',
          'Vänligen aktivera Bluetooth för att använda denna app',
          [{text: 'OK'}],
        );
      }
      updateConnectionState();
    } catch (error: any) {
      Alert.alert('Fel', `Kunde inte initiera Bluetooth: ${error.message}`);
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
        'Behörighet krävs',
        'Bluetooth-behörigheter krävs för att söka efter enheter',
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
          'Inga enheter hittades',
          'Inga Whoop-enheter hittades. Se till att din enhet är i närheten och påslagen.',
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Sökningsfel',
        error.message || 'Kunde inte söka efter enheter',
      );
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
      Alert.alert('Ansluten', `Ansluten till ${device.name}`);
    } catch (error: any) {
      setConnectionState('error');
      Alert.alert(
        'Anslutning misslyckades',
        error.message || 'Kunde inte ansluta till enheten',
      );
      updateConnectionState();
    }
  };

  const startMonitoring = async () => {
    if (!bluetoothService.isConnected()) {
      Alert.alert('Inte ansluten', 'Vänligen anslut till en enhet först');
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
      Alert.alert('Fel', `Kunde inte starta övervakning: ${error.message}`);
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
    Alert.alert('Logga ut', 'Är du säker på att du vill logga ut?', [
      {text: 'Avbryt', style: 'cancel'},
      {
        text: 'Logga ut',
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

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Ansluten';
      case 'connecting':
        return 'Ansluter';
      case 'error':
        return 'Fel';
      default:
        return 'Frånkopplad';
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
          <Text style={styles.logoutButton}>Logga ut</Text>
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
            <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
          </View>
          {selectedDevice && (
            <Text style={styles.deviceName}>{selectedDevice.name}</Text>
          )}
          {uploadQueueSize > 0 && (
            <Text style={styles.queueText}>
              {uploadQueueSize} avläsning(ar) i kö för uppladdning
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
            <Text style={styles.noDataText}>Ingen pulsdata</Text>
          )}
        </View>

        {/* Device Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enheter</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={scanForDevices}
            disabled={isScanning}>
            {isScanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sök efter enheter</Text>
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
            <Text style={styles.sectionTitle}>Övervakning</Text>
            {!isMonitoring ? (
              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={startMonitoring}>
                <Text style={styles.buttonText}>Starta övervakning</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.buttonDanger}
                onPress={stopMonitoring}>
                <Text style={styles.buttonText}>Stoppa övervakning</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.buttonSecondary}
              onPress={disconnect}>
              <Text style={styles.buttonText}>Koppla från</Text>
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
