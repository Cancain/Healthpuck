import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {apiService} from '../../services/api';
import {usePatient} from '../../contexts/PatientContext';
import type {Medication} from '../../types/api';
import HPTextInput from '../../components/HPTextInput';

export const MedicationsSettings: React.FC = () => {
  const {patient, isCaretakerRole, isPatientRole} = usePatient();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMedications = useCallback(async () => {
    if (!patient?.id) {
      setMedications([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await apiService.getMedications(patient.id);
      setMedications(data);
    } catch (error: any) {
      Alert.alert('Fel', error.message || 'Kunde inte hämta mediciner');
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    loadMedications();
  }, [patient, loadMedications]);

  const startCreate = () => {
    setShowCreate(true);
    setEditingId(null);
    setName('');
    setDosage('');
    setFrequency('');
    setNotes('');
  };

  const startEdit = (medication: Medication) => {
    setEditingId(medication.id);
    setShowCreate(false);
    setName(medication.name);
    setDosage(medication.dosage);
    setFrequency(medication.frequency);
    setNotes(medication.notes || '');
  };

  const cancel = () => {
    setShowCreate(false);
    setEditingId(null);
    setName('');
    setDosage('');
    setFrequency('');
    setNotes('');
  };

  const handleSave = async () => {
    if (!patient?.id) {
      return;
    }

    if (!name.trim() || !dosage.trim() || !frequency.trim()) {
      Alert.alert('Fel', 'Namn, dosering och frekvens krävs');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await apiService.updateMedication(
          editingId,
          name.trim(),
          dosage.trim(),
          frequency.trim(),
          notes.trim() || null,
        );
        Alert.alert('Lyckades', 'Medicin uppdaterad');
      } else {
        await apiService.createMedication(
          patient.id,
          name.trim(),
          dosage.trim(),
          frequency.trim(),
          notes.trim() || null,
        );
        Alert.alert('Lyckades', 'Medicin tillagd');
      }
      cancel();
      await loadMedications();
    } catch (error: any) {
      Alert.alert('Fel', error.message || 'Kunde inte spara medicin');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (medicationId: number, medicationName: string) => {
    Alert.alert(
      'Ta bort medicin',
      `Är du säker på att du vill ta bort ${medicationName}?`,
      [
        {text: 'Avbryt', style: 'cancel'},
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteMedication(medicationId);
              Alert.alert('Lyckades', 'Medicin borttagen');
              await loadMedications();
            } catch (error: any) {
              Alert.alert('Fel', error.message || 'Kunde inte ta bort medicin');
            }
          },
        },
      ],
    );
  };

  if (isCaretakerRole && !isPatientRole) {
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
          Mediciner hanteras per patient. Välj en patient från dashboarden för
          att se deras mediciner.
        </Text>
      </View>
    );
  }

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
            Lägg till medicin
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
            {editingId ? 'Redigera medicin' : 'Lägg till ny medicin'}
          </Text>
          <HPTextInput
            placeholder="Namn *"
            value={name}
            onChangeText={setName}
            editable={!saving}
          />
          <HPTextInput
            placeholder="Dosering * (t.ex. 500mg)"
            value={dosage}
            onChangeText={setDosage}
            editable={!saving}
          />
          <HPTextInput
            placeholder="Frekvens * (t.ex. 2 gånger per dag)"
            value={frequency}
            onChangeText={setFrequency}
            editable={!saving}
          />
          <HPTextInput
            placeholder="Anteckningar"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!saving}
          />
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

      {medications.length === 0 ? (
        <Text
          style={{
            color: '#999',
            fontSize: 14,
            fontStyle: 'italic',
            textAlign: 'center',
            padding: 20,
          }}>
          Inga mediciner ännu
        </Text>
      ) : (
        medications.map(medication => (
          <View
            key={medication.id}
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
            }}>
            <View style={{marginBottom: 12}}>
              <View style={{gap: 4}}>
                <Text style={{fontSize: 16, fontWeight: '600', color: '#333'}}>
                  {medication.name}
                </Text>
                <Text style={{fontSize: 14, color: '#666'}}>
                  {medication.dosage} • {medication.frequency}
                </Text>
                {medication.notes && (
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#666',
                      fontStyle: 'italic',
                      marginTop: 4,
                    }}>
                    {medication.notes}
                  </Text>
                )}
              </View>
            </View>
            <View style={{flexDirection: 'row', gap: 8}}>
              <TouchableOpacity
                style={[
                  {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
                  {backgroundColor: '#9E9E9E'},
                  {flex: 1},
                ]}
                onPress={() => startEdit(medication)}>
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
                onPress={() => handleDelete(medication.id, medication.name)}>
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
