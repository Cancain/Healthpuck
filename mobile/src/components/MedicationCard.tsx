import React, {useState} from 'react';
import {View, Text, TouchableOpacity, TextInput} from 'react-native';
import type {Medication, CheckInItem} from '../types/api';

interface MedicationCardProps {
  medication: Medication;
  latestCheckIn?: CheckInItem;
  onCheckIn: (
    medicationId: number,
    status: 'taken' | 'skipped',
    notes?: string,
  ) => void;
}

export const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  latestCheckIn,
  onCheckIn,
}) => {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const statusLabels = {
    taken: 'Tagen',
    skipped: 'Hoppad över',
    missed: 'Missad',
  };

  const statusColors = {
    taken: '#4CAF50',
    skipped: '#FF9800',
    missed: '#F44336',
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onCheckIn(medication.id, 'taken', note.trim() || undefined);
      setNote('');
    } catch (error) {
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
      }}>
      <View style={{marginBottom: 8}}>
        <View style={{gap: 4}}>
          <Text style={{fontSize: 18, fontWeight: '600', color: '#333'}}>
            {medication.name}
          </Text>
          <Text style={{fontSize: 14, color: '#666'}}>{medication.dosage}</Text>
          <Text style={{fontSize: 14, color: '#666'}}>
            {medication.frequency}
          </Text>
        </View>
      </View>
      {medication.notes && (
        <Text
          style={{
            fontSize: 14,
            color: '#666',
            fontStyle: 'italic',
            marginTop: 8,
            marginBottom: 8,
          }}>
          {medication.notes}
        </Text>
      )}
      {latestCheckIn && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: 8,
            marginBottom: 12,
            gap: 8,
          }}>
          <View
            style={[
              {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4},
              {backgroundColor: statusColors[latestCheckIn.status]},
            ]}>
            <Text style={{color: '#fff', fontSize: 12, fontWeight: '600'}}>
              {statusLabels[latestCheckIn.status]}
            </Text>
          </View>
          <Text style={{fontSize: 12, color: '#666'}}>
            {formatDate(latestCheckIn.takenAt)}
          </Text>
          {latestCheckIn.recordedByName && (
            <Text style={{fontSize: 12, color: '#666'}}>
              · {latestCheckIn.recordedByName}
            </Text>
          )}
        </View>
      )}
      {!latestCheckIn && (
        <Text
          style={{fontSize: 12, color: '#999', marginTop: 8, marginBottom: 12}}>
          Inga check-ins registrerade ännu.
        </Text>
      )}
      <TextInput
        style={{
          backgroundColor: '#f5f5f5',
          borderRadius: 6,
          padding: 12,
          fontSize: 14,
          color: '#333',
          marginBottom: 12,
          minHeight: 60,
          textAlignVertical: 'top',
        }}
        placeholder="Anteckning (valfritt)"
        placeholderTextColor="#999"
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
        editable={!submitting}
      />
      <TouchableOpacity
        style={[
          {
            backgroundColor: '#007AFF',
            borderRadius: 6,
            padding: 12,
            alignItems: 'center',
          },
          submitting && {opacity: 0.6},
        ]}
        onPress={handleSubmit}
        disabled={submitting}>
        <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
          {submitting ? 'Sparar...' : 'Markera tagen'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
