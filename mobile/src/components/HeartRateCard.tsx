import React from 'react';
import {View, Text} from 'react-native';
import {colors} from '../utils/theme';

interface HeartRateCardProps {
  heartRate: number | null;
  connected: boolean;
  patientRole?: string;
}

export const HeartRateCard: React.FC<HeartRateCardProps> = ({
  heartRate,
  connected,
  patientRole,
}) => {
  const isReadOnly = patientRole === 'caregiver';

  return (
    <View style={{backgroundColor: '#fff', borderRadius: 8, padding: 16}}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}>
        <Text
          style={{fontSize: 16, fontWeight: '600', color: colors.primary.dark}}>
          Hjärtfrekvens
        </Text>
        {connected && !isReadOnly && (
          <View
            style={{
              backgroundColor: '#4CAF50',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
            }}>
            <Text style={{color: '#fff', fontSize: 10, fontWeight: '600'}}>
              Ansluten
            </Text>
          </View>
        )}
      </View>
      <View style={{alignItems: 'center', paddingVertical: 20}}>
        {heartRate !== null ? (
          <>
            <Text style={{fontSize: 48, fontWeight: 'bold', color: '#F44336'}}>
              {heartRate}
            </Text>
            <Text style={{fontSize: 18, color: '#666', marginTop: 4}}>bpm</Text>
          </>
        ) : (
          <Text style={{fontSize: 16, color: '#999', fontStyle: 'italic'}}>
            {isReadOnly ? 'Väntar på patientdata...' : 'Ingen data tillgänglig'}
          </Text>
        )}
      </View>
    </View>
  );
};
