import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {useAuth} from '../contexts/AuthContext';
import {usePatient} from '../contexts/PatientContext';
import {apiService} from '../services/api';
import type {Patient, ActiveAlert, HeartRateResponse} from '../types/api';
import {HeartRateCard} from '../components/HeartRateCard';
import {colors} from '../utils/theme';
import type {MainTabParamList} from '../navigation/types';

interface PatientData extends Patient {
  heartRate: number | null;
  activeAlerts: ActiveAlert[];
  loading: boolean;
}

type NavigationProp = BottomTabNavigationProp<MainTabParamList, 'Settings'>;

export const CaregiverDashboardScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {user} = useAuth();
  const {organisation} = usePatient();
  const [patients, setPatients] = useState<PatientData[]>([]);
  const [expandedPatientIds, setExpandedPatientIds] = useState<Set<number>>(
    new Set(),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPatients = useCallback(async () => {
    try {
      const patientList = await apiService.getOrganisationPatients();
      setPatients(
        patientList.map(p => ({
          ...p,
          heartRate: null,
          activeAlerts: [],
          loading: false,
        })),
      );
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  }, []);

  const loadPatientData = useCallback(async (patientId: number) => {
    setPatients(prev =>
      prev.map(p => (p.id === patientId ? {...p, loading: true} : p)),
    );

    let heartRate: HeartRateResponse | null = null;
    let alerts: ActiveAlert[] = [];

    try {
      heartRate = await apiService.getPatientHeartRate(patientId);
    } catch (error) {
      console.error(
        `Error loading heart rate for patient ${patientId}:`,
        error,
      );
      heartRate = {heartRate: null, cached: false, rateLimited: false};
    }

    try {
      alerts = await apiService.getPatientAlerts(patientId);
      console.log(
        `[CaregiverDashboard] Loaded alerts for patient ${patientId}:`,
        alerts.length,
        'alerts',
      );
      if (alerts.length > 0) {
        console.log(
          '[CaregiverDashboard] Alert details:',
          JSON.stringify(
            alerts.map(a => ({
              id: a.alert.id,
              name: a.alert.name,
              isActive: a.isActive,
              currentValue: a.currentValue,
              metricType: a.alert.metricType,
              metricPath: a.alert.metricPath,
              operator: a.alert.operator,
              thresholdValue: a.alert.thresholdValue,
            })),
            null,
            2,
          ),
        );
      } else {
        console.log(
          `[CaregiverDashboard] No alerts returned for patient ${patientId}`,
        );
      }
    } catch (error) {
      console.error(
        `[CaregiverDashboard] Error loading alerts for patient ${patientId}:`,
        error,
      );
    }

    setPatients(prev =>
      prev.map(p =>
        p.id === patientId
          ? {
              ...p,
              heartRate: heartRate?.heartRate ?? null,
              activeAlerts: alerts,
              loading: false,
            }
          : p,
      ),
    );
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPatients();
    for (const id of expandedPatientIds) {
      await loadPatientData(id);
    }
    setRefreshing(false);
  }, [loadPatients, loadPatientData, expandedPatientIds]);

  useEffect(() => {
    loadPatients();
    setLoading(false);
  }, [loadPatients]);

  useEffect(() => {
    expandedPatientIds.forEach(id => loadPatientData(id));
  }, [expandedPatientIds, loadPatientData]);

  const togglePatient = (patientId: number) => {
    setExpandedPatientIds(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  };

  const getStatusIcon = (patient: PatientData): string => {
    const hasActiveAlerts = patient.activeAlerts.some(a => a.isActive);
    if (hasActiveAlerts) {
      return '🔴';
    }
    return '🟢';
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color={colors.primary.dark} />
        <Text style={{marginTop: 16, color: colors.primary.dark}}>
          Laddar...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: colors.primary.background}}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={{padding: 20}}>
        <View
          style={{
            backgroundColor: colors.semantic.white,
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: colors.primary.dark,
              marginBottom: 4,
            }}>
            Välkommen {user?.name}
          </Text>
          <Text style={{fontSize: 14, color: colors.primary.dark}}>
            {user?.email}
          </Text>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: colors.primary.dark,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 4,
              marginTop: 12,
            }}>
            <Text
              style={{
                color: colors.semantic.white,
                fontSize: 12,
                fontWeight: '600',
              }}>
              Omsorgsgivare
            </Text>
          </View>
        </View>

        {organisation && (
          <View
            style={{
              backgroundColor: colors.semantic.white,
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: colors.primary.dark,
              }}>
              {organisation.organisationName}
            </Text>
          </View>
        )}

        {patients.length === 0 ? (
          <View
            style={{
              backgroundColor: colors.semantic.white,
              borderRadius: 8,
              padding: 24,
              alignItems: 'center',
            }}>
            <Text style={{color: colors.primary.dark, fontSize: 16}}>
              Inga patienter hittades
            </Text>
          </View>
        ) : (
          patients.map(patient => (
            <View
              key={patient.id}
              style={{
                backgroundColor: colors.semantic.white,
                borderRadius: 8,
                marginBottom: 12,
                overflow: 'hidden',
              }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                }}
                onPress={() => togglePatient(patient.id)}>
                <View
                  style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  <Text style={{fontSize: 18}}>{getStatusIcon(patient)}</Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: colors.primary.dark,
                    }}>
                    {patient.name}
                  </Text>
                </View>
                <Text style={{color: colors.primary.dark, fontSize: 14}}>
                  {expandedPatientIds.has(patient.id) ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {expandedPatientIds.has(patient.id) && (
                <View
                  style={{
                    padding: 16,
                    borderTopWidth: 1,
                    borderTopColor: '#e0e0e0',
                  }}>
                  {patient.loading ? (
                    <View style={{padding: 20, alignItems: 'center'}}>
                      <ActivityIndicator
                        size="small"
                        color={colors.primary.dark}
                      />
                      <Text style={{marginTop: 8, color: colors.primary.dark}}>
                        Laddar data...
                      </Text>
                    </View>
                  ) : (
                    <>
                      {patient.heartRate !== null && (
                        <View style={{marginBottom: 16}}>
                          <HeartRateCard
                            heartRate={patient.heartRate}
                            connected={false}
                            patientRole="caregiver"
                          />
                        </View>
                      )}

                      <View style={{marginBottom: 16}}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: colors.primary.dark,
                            marginBottom: 12,
                          }}>
                          Aktiva alarm
                        </Text>
                        {patient.activeAlerts.length === 0 ? (
                          <Text
                            style={{
                              color: colors.device.iconGray,
                              fontSize: 14,
                              fontStyle: 'italic',
                            }}>
                            Inga aktiva alarm
                          </Text>
                        ) : (
                          patient.activeAlerts.map(activeAlert => (
                            <View
                              key={activeAlert.alert.id}
                              style={{
                                backgroundColor: '#fff5f5',
                                borderRadius: 4,
                                padding: 12,
                                marginBottom: 8,
                                borderLeftWidth: 4,
                                borderLeftColor: '#dc3545',
                              }}>
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: '500',
                                  color: colors.primary.dark,
                                  marginBottom: 4,
                                }}>
                                {activeAlert.alert.name}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: colors.device.iconGray,
                                  marginBottom: 4,
                                }}>
                                {activeAlert.alert.priority === 'high'
                                  ? 'Hög prioritet'
                                  : activeAlert.alert.priority === 'mid'
                                    ? 'Medel prioritet'
                                    : 'Låg prioritet'}
                              </Text>
                              {activeAlert.currentValue !== null && (
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: colors.device.iconGray,
                                  }}>
                                  Nuvarande värde: {activeAlert.currentValue}
                                </Text>
                              )}
                            </View>
                          ))
                        )}
                      </View>

                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.primary.dark,
                          borderRadius: 8,
                          padding: 12,
                          alignItems: 'center',
                        }}
                        onPress={() => {
                          navigation.navigate('Settings', {
                            patientId: patient.id,
                          });
                        }}>
                        <Text
                          style={{
                            color: colors.semantic.white,
                            fontSize: 16,
                            fontWeight: '600',
                          }}>
                          Hantera alarm
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};
