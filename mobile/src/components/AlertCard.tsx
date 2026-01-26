import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import type {ActiveAlert} from '../types/api';
import {colors} from '../utils/theme';

interface AlertCardProps {
  alert: ActiveAlert;
  onDismiss: () => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({alert, onDismiss}) => {
  const priorityColors = {
    high: '#F44336',
    mid: '#FF9800',
    low: '#FFC107',
  };

  const priorityLabels = {
    high: 'Hög prioritet',
    mid: 'Medel prioritet',
    low: 'Låg prioritet',
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
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
        borderLeftWidth: 4,
        borderLeftColor: '#F44336',
      }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.primary.dark,
              marginRight: 8,
            }}>
            {alert.alert.name}
          </Text>
          <View
            style={[
              {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4},
              {backgroundColor: priorityColors[alert.alert.priority]},
            ]}>
            <Text style={{color: '#fff', fontSize: 10, fontWeight: '600'}}>
              {priorityLabels[alert.alert.priority]}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          style={{
            width: 24,
            height: 24,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{fontSize: 24, color: '#999', lineHeight: 24}}>×</Text>
        </TouchableOpacity>
      </View>
      <Text style={{fontSize: 12, color: colors.primary.dark, marginBottom: 8}}>
        {formatDate(alert.triggeredAt)}
      </Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
        <Text style={{fontSize: 14, color: colors.primary.dark}}>
          Nuvarande värde:{' '}
          <Text style={{fontWeight: '600', color: colors.primary.dark}}>
            {alert.currentValue}
          </Text>
        </Text>
        <Text style={{fontSize: 14, color: '#666'}}>
          Tröskel: {alert.alert.operator} {alert.alert.thresholdValue}
        </Text>
      </View>
    </View>
  );
};
