import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useAuth} from '../contexts/AuthContext';
import {usePatient} from '../contexts/PatientContext';
import {apiService} from '../services/api';
import {bluetoothService} from '../services/bluetooth';
import {backgroundService} from '../services/backgroundService';
import type {
  ActiveAlert,
  Medication,
  CheckInResponse,
  WhoopMetricsResponse,
} from '../types/api';
import {AlertCard} from '../components/AlertCard';
import {HeartRateCard} from '../components/HeartRateCard';
import {MedicationCard} from '../components/MedicationCard';
import {WhoopMetricsCard} from '../components/WhoopMetricsCard';

export const DashboardScreen: React.FC = () => {
  const {user} = useAuth();
  const {patient, isPatientRole} = usePatient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationsLoading, setMedicationsLoading] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckInResponse | null>(null);
  const [_checkInsLoading, setCheckInsLoading] = useState(false);
  const [whoopMetrics, setWhoopMetrics] = useState<WhoopMetricsResponse | null>(
    null,
  );
  const [whoopLoading, setWhoopLoading] = useState(false);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const alertsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartRateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const patientIdRef = useRef<number | undefined>(patient?.id);

  const loadActiveAlerts = async () => {
    try {
      setAlertsLoading(true);
      const alerts = await apiService.getActiveAlerts();
      setActiveAlerts(alerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleDismissAlert = async (alertId: number) => {
    try {
      await apiService.dismissAlert(alertId);
      setActiveAlerts(prev => prev.filter(a => a.alert.id !== alertId));
    } catch (error) {
      Alert.alert('Fel', 'Kunde inte dismissa varning');
    }
  };

  const loadMedications = async () => {
    if (!patient?.id) {
      setMedications([]);
      return;
    }
    try {
      setMedicationsLoading(true);
      const meds = await apiService.getMedications(patient.id);
      setMedications(meds);
    } catch (error) {
      console.error('Error loading medications:', error);
    } finally {
      setMedicationsLoading(false);
    }
  };

  const loadCheckIns = async () => {
    if (!patient?.id) {
      setCheckIns(null);
      return;
    }
    try {
      setCheckInsLoading(true);
      const data = await apiService.getCheckIns(7);
      setCheckIns(data);
    } catch (error) {
      console.error('Error loading check-ins:', error);
    } finally {
      setCheckInsLoading(false);
    }
  };

  const handleCheckIn = async (
    medicationId: number,
    status: 'taken' | 'skipped' = 'taken',
    notes?: string,
  ) => {
    try {
      await apiService.createCheckIn(medicationId, status, notes);
      await loadCheckIns();
      Alert.alert('Lyckades', 'Check-in registrerad');
    } catch (error: any) {
      Alert.alert('Fel', error.message || 'Kunde inte registrera check-in');
    }
  };

  const loadWhoopMetrics = async () => {
    try {
      setWhoopLoading(true);
      const metrics = await apiService.getWhoopMetrics();
      setWhoopMetrics(metrics);
    } catch (error: any) {
      if (error.message?.includes('404')) {
        setWhoopMetrics(null);
      } else {
        console.error('Error loading Whoop metrics:', error);
      }
    } finally {
      setWhoopLoading(false);
    }
  };

  const loadHeartRate = useCallback(async () => {
    try {
      const currentPatientId = patientIdRef.current;
      const response = await apiService.getHeartRate(currentPatientId);
      if (response.heartRate !== null && response.heartRate !== undefined) {
        setHeartRate(response.heartRate);
      }
    } catch (error: any) {
      if (!error.message?.includes('404')) {
        console.error('Error loading heart rate:', error);
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([
      loadActiveAlerts(),
      loadMedications(),
      loadCheckIns(),
      loadWhoopMetrics(),
      loadHeartRate(),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadHeartRate]);

  const startAlertsPolling = useCallback(() => {
    if (alertsIntervalRef.current) {
      clearInterval(alertsIntervalRef.current);
    }
    alertsIntervalRef.current = setInterval(() => {
      loadActiveAlerts();
    }, 30000);
  }, []);

  const startHeartRatePolling = useCallback(() => {
    if (heartRateIntervalRef.current) {
      clearInterval(heartRateIntervalRef.current);
    }
    heartRateIntervalRef.current = setInterval(() => {
      const currentPatientId = patientIdRef.current;
      apiService
        .getHeartRate(currentPatientId)
        .then(response => {
          if (response.heartRate !== null && response.heartRate !== undefined) {
            setHeartRate(response.heartRate);
          }
        })
        .catch((error: any) => {
          if (!error.message?.includes('404')) {
            console.error('Error loading heart rate:', error);
          }
        });
    }, 10000);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const setupBluetoothMonitoring = async () => {
    try {
      await bluetoothService.initialize();
      const connected = bluetoothService.isConnected();
      setBluetoothConnected(connected);

      if (connected) {
        const handleHeartRate = async (hr: number) => {
          setHeartRate(hr);
          try {
            await apiService.uploadHeartRate(hr, 'bluetooth');
          } catch (error) {
            console.error('Failed to upload heart rate:', error);
          }
        };

        await bluetoothService.startHeartRateMonitoring(handleHeartRate);
        setIsMonitoring(true);
        try {
          await backgroundService.startService();
        } catch (error) {
          console.warn('Failed to start background service:', error);
        }
      }
    } catch (error) {
      console.error('Error setting up Bluetooth:', error);
    }
  };

  useEffect(() => {
    patientIdRef.current = patient?.id;
  }, [patient?.id]);

  useEffect(() => {
    loadData();
    if (isPatientRole) {
      setupBluetoothMonitoring();
    }
  }, [isPatientRole, loadData]);

  useEffect(() => {
    startAlertsPolling();
    startHeartRatePolling();
    return () => {
      if (alertsIntervalRef.current) {
        clearInterval(alertsIntervalRef.current);
      }
      if (heartRateIntervalRef.current) {
        clearInterval(heartRateIntervalRef.current);
      }
    };
  }, [startAlertsPolling, startHeartRatePolling]);

  useEffect(() => {
    return () => {
      if (isMonitoring) {
        bluetoothService.stopHeartRateMonitoring();
        backgroundService.stopService().catch(() => {});
      }
    };
  }, [isMonitoring]);

  const latestCheckInByMedication = React.useMemo(() => {
    if (!checkIns) {
      return new Map();
    }
    const map = new Map<number, (typeof checkIns.checkIns)[0]>();
    for (const checkIn of checkIns.checkIns) {
      const existing = map.get(checkIn.medicationId);
      if (
        !existing ||
        new Date(checkIn.takenAt).getTime() >
          new Date(existing.takenAt).getTime()
      ) {
        map.set(checkIn.medicationId, checkIn);
      }
    }
    return map;
  }, [checkIns]);

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: '#f5f5f5'}}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View
        style={{
          backgroundColor: '#fff',
          padding: 20,
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
        }}>
        <View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: '#333',
              marginBottom: 4,
            }}>
            Välkommen, {user?.name || 'Användare'}
          </Text>
          {user?.email && (
            <Text style={{fontSize: 14, color: '#666'}}>{user.email}</Text>
          )}
        </View>
        {patient && (
          <View
            style={{
              marginTop: 12,
              padding: 8,
              backgroundColor: '#f0f0f0',
              borderRadius: 6,
            }}>
            <Text style={{fontSize: 12, color: '#666'}}>Omsorgstagare</Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#333',
                marginTop: 2,
              }}>
              {patient.name}
            </Text>
          </View>
        )}
      </View>

      <View style={{padding: 20, marginTop: 8}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
          }}>
          <Text style={{fontSize: 18, fontWeight: '600', color: '#333'}}>
            Aktiva varningar
          </Text>
          {activeAlerts.length > 0 && (
            <View
              style={{
                backgroundColor: '#007AFF',
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                marginLeft: 8,
              }}>
              <Text style={{color: '#fff', fontSize: 12, fontWeight: '600'}}>
                {activeAlerts.length}
              </Text>
            </View>
          )}
        </View>
        {alertsLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : activeAlerts.length > 0 ? (
          activeAlerts.map(activeAlert => (
            <AlertCard
              key={activeAlert.alert.id}
              alert={activeAlert}
              onDismiss={() => handleDismissAlert(activeAlert.alert.id)}
            />
          ))
        ) : (
          <Text style={{color: '#999', fontSize: 14, fontStyle: 'italic'}}>
            Inga aktiva varningar
          </Text>
        )}
      </View>

      <View style={{padding: 20, marginTop: 8}}>
        <Text style={{fontSize: 18, fontWeight: '600', color: '#333'}}>
          Hjärtfrekvens
        </Text>
        <HeartRateCard
          heartRate={heartRate}
          connected={bluetoothConnected}
          patientRole={patient?.role}
        />
      </View>

      <View style={{padding: 20, marginTop: 8}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
          }}>
          <Text style={{fontSize: 18, fontWeight: '600', color: '#333'}}>
            Whoop-status
          </Text>
        </View>
        {whoopLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : whoopMetrics ? (
          <WhoopMetricsCard metrics={whoopMetrics} />
        ) : (
          <Text style={{color: '#999', fontSize: 14, fontStyle: 'italic'}}>
            Ingen Whoop-anslutning hittades. Gå till inställningarna för att
            koppla Whoop.
          </Text>
        )}
      </View>

      <View style={{padding: 20, marginTop: 8}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
          }}>
          <Text style={{fontSize: 18, fontWeight: '600', color: '#333'}}>
            Läkemedel & check-ins
          </Text>
        </View>
        {checkIns?.summary && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              backgroundColor: '#fff',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}>
            <View style={{alignItems: 'center'}}>
              <Text style={{fontSize: 12, color: '#666', marginBottom: 4}}>
                Registrerade
              </Text>
              <Text style={{fontSize: 20, fontWeight: 'bold', color: '#333'}}>
                {checkIns.summary.total}
              </Text>
            </View>
            <View style={{alignItems: 'center'}}>
              <Text style={{fontSize: 12, color: '#666', marginBottom: 4}}>
                Tagna
              </Text>
              <Text
                style={[
                  {fontSize: 20, fontWeight: 'bold', color: '#333'},
                  {color: '#4CAF50'},
                ]}>
                {checkIns.summary.taken}
              </Text>
            </View>
            <View style={{alignItems: 'center'}}>
              <Text style={{fontSize: 12, color: '#666', marginBottom: 4}}>
                Hoppade över
              </Text>
              <Text
                style={[
                  {fontSize: 20, fontWeight: 'bold', color: '#333'},
                  {color: '#FF9800'},
                ]}>
                {checkIns.summary.skipped}
              </Text>
            </View>
            <View style={{alignItems: 'center'}}>
              <Text style={{fontSize: 12, color: '#666', marginBottom: 4}}>
                Missade
              </Text>
              <Text
                style={[
                  {fontSize: 20, fontWeight: 'bold', color: '#333'},
                  {color: '#F44336'},
                ]}>
                {checkIns.summary.missed}
              </Text>
            </View>
          </View>
        )}
        {medicationsLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : medications.length > 0 ? (
          medications.map(medication => (
            <MedicationCard
              key={medication.id}
              medication={medication}
              latestCheckIn={latestCheckInByMedication.get(medication.id)}
              onCheckIn={handleCheckIn}
            />
          ))
        ) : (
          <Text style={{color: '#999', fontSize: 14, fontStyle: 'italic'}}>
            Inga läkemedel är registrerade ännu.
          </Text>
        )}
      </View>
    </ScrollView>
  );
};
