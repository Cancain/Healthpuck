import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert as RNAlert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {apiService} from '../../services/api';
import {usePatient} from '../../contexts/PatientContext';
import type {Alert} from '../../types/api';
import HPTextInput from '../../components/HPTextInput';

export const AlertsSettings: React.FC = () => {
  const {patient} = usePatient();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [metricType, setMetricType] = useState<'whoop' | 'medication' | ''>('');
  const [metricPath, setMetricPath] = useState('');
  const [operator, setOperator] = useState<'<' | '>' | '=' | '<=' | '>=' | ''>(
    '',
  );
  const [thresholdValue, setThresholdValue] = useState('');
  const [priority, setPriority] = useState<'high' | 'mid' | 'low' | ''>('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [patient]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAlerts();
      setAlerts(data);
    } catch (error: any) {
      RNAlert.alert('Fel', error.message || 'Kunde inte hämta varningar');
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setShowCreate(true);
    setEditingId(null);
    resetForm();
  };

  const startEdit = (alert: Alert) => {
    setEditingId(alert.id);
    setShowCreate(false);
    setName(alert.name);
    setMetricType(alert.metricType);
    setMetricPath(alert.metricPath);
    setOperator(alert.operator);
    setThresholdValue(alert.thresholdValue);
    setPriority(alert.priority);
    setEnabled(alert.enabled);
  };

  const resetForm = () => {
    setName('');
    setMetricType('');
    setMetricPath('');
    setOperator('');
    setThresholdValue('');
    setPriority('');
    setEnabled(true);
  };

  const cancel = () => {
    setShowCreate(false);
    setEditingId(null);
    resetForm();
  };

  const handleSave = async () => {
    if (!patient?.id) {
      return;
    }

    if (
      !name.trim() ||
      !metricType ||
      !metricPath.trim() ||
      !operator ||
      !thresholdValue.trim() ||
      !priority
    ) {
      RNAlert.alert('Fel', 'Vänligen fyll i alla obligatoriska fält');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await apiService.updateAlert(editingId, {
          name: name.trim(),
          metricType: metricType as 'whoop' | 'medication',
          metricPath: metricPath.trim(),
          operator: operator as '<' | '>' | '=' | '<=' | '>=',
          thresholdValue: thresholdValue.trim(),
          priority: priority as 'high' | 'mid' | 'low',
          enabled,
        });
        RNAlert.alert('Lyckades', 'Varning uppdaterad');
      } else {
        await apiService.createAlert(
          patient.id,
          name.trim(),
          metricType as 'whoop' | 'medication',
          metricPath.trim(),
          operator as '<' | '>' | '=' | '<=' | '>=',
          thresholdValue.trim(),
          priority as 'high' | 'mid' | 'low',
          enabled,
        );
        RNAlert.alert('Lyckades', 'Varning skapad');
      }
      cancel();
      await loadAlerts();
    } catch (error: any) {
      RNAlert.alert('Fel', error.message || 'Kunde inte spara varning');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (alertId: number, alertName: string) => {
    RNAlert.alert(
      'Ta bort varning',
      `Är du säker på att du vill ta bort varningen "${alertName}"?`,
      [
        {text: 'Avbryt', style: 'cancel'},
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteAlert(alertId);
              RNAlert.alert('Lyckades', 'Varning borttagen');
              await loadAlerts();
            } catch (error: any) {
              RNAlert.alert(
                'Fel',
                error.message || 'Kunde inte ta bort varning',
              );
            }
          },
        },
      ],
    );
  };

  const getMetricPathOptions = () => {
    if (metricType === 'whoop') {
      return [
        {value: 'heart_rate', label: 'Hjärtfrekvens'},
        {value: 'recovery.score.recovery_score', label: 'Återhämtningspoäng'},
        {value: 'recovery.score.resting_heart_rate', label: 'Vilopuls'},
        {value: 'recovery.score.hrv_rmssd_milli', label: 'HRV RMSSD'},
        {value: 'recovery.score.spo2_percentage', label: 'Syrehalt (%)'},
        {
          value: 'sleep.score.sleep_performance_percentage',
          label: 'Sömnprestanda (%)',
        },
      ];
    } else if (metricType === 'medication') {
      return [{value: 'missed_dose', label: 'Missade doser (senaste 24h)'}];
    }
    return [];
  };

  if (!patient) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
        <Text
          style={{
            color: '#999',
            fontSize: 14,
            fontStyle: 'italic',
            textAlign: 'center',
            padding: 20,
          }}>
          Du har inga omsorgstagare ännu. Lägg till en omsorgstagare först.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={{flex: 1, padding: 20}}>
      {!showCreate && !editingId && (
        <TouchableOpacity
          style={{
            backgroundColor: '#007AFF',
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            marginBottom: 20,
          }}
          onPress={startCreate}>
          <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
            Lägg till varning
          </Text>
        </TouchableOpacity>
      )}

      {(showCreate || editingId) && (
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
          }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#333',
              marginBottom: 16,
            }}>
            {editingId ? 'Redigera varning' : 'Skapa ny varning'}
          </Text>
          <HPTextInput
            placeholder="Namn *"
            value={name}
            onChangeText={setName}
            editable={!saving}
          />
          <TouchableOpacity
            style={{
              backgroundColor: '#f5f5f5',
              borderRadius: 6,
              padding: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#ddd',
            }}
            onPress={() => {
              RNAlert.alert('Välj måtttyp', '', [
                {text: 'Avbryt', style: 'cancel'},
                {
                  text: 'Whoop',
                  onPress: () => {
                    setMetricType('whoop');
                    setMetricPath('');
                  },
                },
                {
                  text: 'Medicin',
                  onPress: () => {
                    setMetricType('medication');
                    setMetricPath('');
                  },
                },
              ]);
            }}
            disabled={saving}>
            <Text style={{fontSize: 14, color: '#333'}}>
              Måtttyp *:{' '}
              {metricType === 'whoop'
                ? 'Whoop'
                : metricType === 'medication'
                  ? 'Medicin'
                  : 'Välj måtttyp'}
            </Text>
          </TouchableOpacity>
          {metricType && (
            <TouchableOpacity
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: 6,
                padding: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#ddd',
              }}
              onPress={() => {
                const options = getMetricPathOptions();
                RNAlert.alert('Välj mått', '', [
                  {text: 'Avbryt', style: 'cancel'},
                  ...options.map(option => ({
                    text: option.label,
                    onPress: () => setMetricPath(option.value),
                  })),
                ]);
              }}
              disabled={saving}>
              <Text style={{fontSize: 14, color: '#333'}}>
                Mått *:{' '}
                {getMetricPathOptions().find(o => o.value === metricPath)
                  ?.label || 'Välj mått'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={{
              backgroundColor: '#f5f5f5',
              borderRadius: 6,
              padding: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#ddd',
            }}
            onPress={() => {
              RNAlert.alert('Välj operator', '', [
                {text: 'Avbryt', style: 'cancel'},
                {text: 'Mindre än (<)', onPress: () => setOperator('<')},
                {text: 'Större än (>)', onPress: () => setOperator('>')},
                {text: 'Lika med (=)', onPress: () => setOperator('=')},
                {
                  text: 'Mindre än eller lika med (<=)',
                  onPress: () => setOperator('<='),
                },
                {
                  text: 'Större än eller lika med (>=)',
                  onPress: () => setOperator('>='),
                },
              ]);
            }}
            disabled={saving}>
            <Text style={{fontSize: 14, color: '#333'}}>
              Operator *:{' '}
              {operator === '<'
                ? 'Mindre än (<)'
                : operator === '>'
                  ? 'Större än (>)'
                  : operator === '='
                    ? 'Lika med (=)'
                    : operator === '<='
                      ? 'Mindre än eller lika med (<=)'
                      : operator === '>='
                        ? 'Större än eller lika med (>=)'
                        : 'Välj operator'}
            </Text>
          </TouchableOpacity>
          <HPTextInput
            placeholder="Tröskelvärde *"
            value={thresholdValue}
            onChangeText={setThresholdValue}
            keyboardType="numeric"
            editable={!saving}
          />
          <TouchableOpacity
            style={{
              backgroundColor: '#f5f5f5',
              borderRadius: 6,
              padding: 12,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#ddd',
            }}
            onPress={() => {
              RNAlert.alert('Välj prioritet', '', [
                {text: 'Avbryt', style: 'cancel'},
                {
                  text: 'Hög (kontrolleras var 30:e sekund)',
                  onPress: () => setPriority('high'),
                },
                {
                  text: 'Medel (kontrolleras var 5:e minut)',
                  onPress: () => setPriority('mid'),
                },
                {
                  text: 'Låg (kontrolleras en gång per dag)',
                  onPress: () => setPriority('low'),
                },
              ]);
            }}
            disabled={saving}>
            <Text style={{fontSize: 14, color: '#333'}}>
              Prioritet *:{' '}
              {priority === 'high'
                ? 'Hög (kontrolleras var 30:e sekund)'
                : priority === 'mid'
                  ? 'Medel (kontrolleras var 5:e minut)'
                  : priority === 'low'
                    ? 'Låg (kontrolleras en gång per dag)'
                    : 'Välj prioritet'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}
            onPress={() => setEnabled(!enabled)}
            disabled={saving}>
            <View
              style={[
                {
                  width: 24,
                  height: 24,
                  borderWidth: 2,
                  borderColor: '#ddd',
                  borderRadius: 4,
                  marginRight: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                enabled && {backgroundColor: '#007AFF', borderColor: '#007AFF'},
              ]}>
              {enabled && (
                <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold'}}>
                  ✓
                </Text>
              )}
            </View>
            <Text style={{fontSize: 14, color: '#333'}}>Aktiverad</Text>
          </TouchableOpacity>
          <View style={{flexDirection: 'row', gap: 12, marginTop: 8}}>
            <TouchableOpacity
              style={[
                {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
                {backgroundColor: '#007AFF'},
              ]}
              onPress={handleSave}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                  Spara
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
                {backgroundColor: '#9E9E9E'},
              ]}
              onPress={cancel}
              disabled={saving}>
              <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                Avbryt
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {alerts.length === 0 ? (
        <Text
          style={{
            color: '#999',
            fontSize: 14,
            fontStyle: 'italic',
            textAlign: 'center',
            padding: 20,
          }}>
          Inga varningar ännu
        </Text>
      ) : (
        alerts.map(alert => (
          <View
            key={alert.id}
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
            }}>
            <View style={{marginBottom: 12}}>
              <View style={{gap: 8}}>
                <Text style={{fontSize: 16, fontWeight: '600', color: '#333'}}>
                  {alert.name}
                </Text>
                <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
                  <View
                    style={[
                      {
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                      },
                      alert.enabled
                        ? {backgroundColor: '#4CAF50'}
                        : {backgroundColor: '#9E9E9E'},
                    ]}>
                    <Text
                      style={{color: '#fff', fontSize: 10, fontWeight: '600'}}>
                      {alert.enabled ? 'Aktiverad' : 'Inaktiverad'}
                    </Text>
                  </View>
                  <View
                    style={[
                      {
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                      },
                      {backgroundColor: '#FF9800'},
                    ]}>
                    <Text
                      style={{color: '#fff', fontSize: 10, fontWeight: '600'}}>
                      {alert.priority === 'high'
                        ? 'Hög'
                        : alert.priority === 'mid'
                          ? 'Medel'
                          : 'Låg'}
                    </Text>
                  </View>
                </View>
                <Text style={{fontSize: 14, color: '#666'}}>
                  {alert.metricType === 'whoop' ? 'Whoop' : 'Medicin'}:{' '}
                  {alert.metricPath}
                </Text>
                <Text style={{fontSize: 14, color: '#666'}}>
                  {alert.operator} {alert.thresholdValue}
                </Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', gap: 8}}>
              <TouchableOpacity
                style={[
                  {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
                  {backgroundColor: '#9E9E9E'},
                  {flex: 1},
                ]}
                onPress={() => startEdit(alert)}>
                <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                  Redigera
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
                  {backgroundColor: '#F44336'},
                  {flex: 1},
                ]}
                onPress={() => handleDelete(alert.id, alert.name)}>
                <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                  Ta bort
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};
