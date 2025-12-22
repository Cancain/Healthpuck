import React from 'react';
import {View, Text, ScrollView} from 'react-native';
import type {WhoopMetricsResponse} from '../types/api';

interface WhoopMetricsCardProps {
  metrics: WhoopMetricsResponse;
}

export const WhoopMetricsCard: React.FC<WhoopMetricsCardProps> = ({
  metrics,
}) => {
  const formatRange = () => {
    const start = new Date(metrics.range.start).toLocaleDateString('sv-SE');
    const end = new Date(metrics.range.end).toLocaleDateString('sv-SE');
    return `${start} – ${end} (${metrics.range.days} dagar)`;
  };

  const extractMetrics = (payload: unknown): Array<[string, number]> => {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const results: Array<[string, number]> = [];
    const seen = new Set<string>();

    const visit = (obj: any, path: string, depth: number) => {
      if (results.length >= 8 || depth >= 2) {
        return;
      }

      if (typeof obj === 'number' && !Number.isNaN(obj)) {
        if (!seen.has(path)) {
          seen.add(path);
          results.push([path, obj]);
        }
        return;
      }

      if (!obj || typeof obj !== 'object') {
        return;
      }

      for (const [key, value] of Object.entries(obj)) {
        const nextPath = path ? `${path}.${key}` : key;
        visit(value, nextPath, depth + 1);
        if (results.length >= 8) {
          break;
        }
      }
    };

    visit(payload, '', 0);
    return results;
  };

  const findLatest = (payload: unknown) => {
    if (!payload) {
      return null;
    }

    if (Array.isArray(payload) && payload.length > 0) {
      return payload[payload.length - 1];
    }

    if (typeof payload === 'object' && payload !== null) {
      const obj = payload as Record<string, unknown>;
      if (Array.isArray(obj.records) && obj.records.length > 0) {
        return obj.records[obj.records.length - 1];
      }
      if (Array.isArray(obj.data) && obj.data.length > 0) {
        return obj.data[obj.data.length - 1];
      }
      return obj;
    }

    return null;
  };

  const translateField = (field: string): string => {
    const translations: Record<string, string> = {
      heart_rate: 'Hjärtfrekvens',
      recovery_score: 'Återhämtningspoäng',
      resting_heart_rate: 'Vilopuls',
      hrv_rmssd_milli: 'HRV RMSSD',
      spo2_percentage: 'Syrehalt (%)',
      sleep_performance_percentage: 'Sömnprestanda (%)',
    };

    return (
      translations[field] ||
      field
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    );
  };

  const formatNumber = (value: number): string => {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  };

  const renderMetricSection = (
    title: string,
    payload: unknown,
    _allowSingle = false,
  ) => {
    const latest = findLatest(payload);
    if (!latest) {
      return null;
    }

    const metricPairs = extractMetrics(latest);

    if (metricPairs.length === 0) {
      return null;
    }

    return (
      <View
        key={title}
        style={{
          minWidth: 200,
          backgroundColor: '#f5f5f5',
          borderRadius: 6,
          padding: 12,
        }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#333',
            marginBottom: 8,
          }}>
          {title}
        </Text>
        {metricPairs.map(([key, value]) => {
          const keysToHide = [
            'id',
            'user_id',
            'sport_id',
            'cycle_id',
            'score.percent_recorded',
          ];
          if (keysToHide.includes(key)) {
            return null;
          }

          return (
            <View
              key={key}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}>
              <Text style={{fontSize: 12, color: '#666', flex: 1}}>
                {translateField(key)}
              </Text>
              <Text style={{fontSize: 12, fontWeight: '600', color: '#333'}}>
                {formatNumber(value)}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={{backgroundColor: '#fff', borderRadius: 8, padding: 16}}>
      <Text style={{fontSize: 12, color: '#666', marginBottom: 12}}>
        {formatRange()}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{flexDirection: 'row', gap: 16}}>
          {renderMetricSection('Cykler', metrics.cycles)}
          {renderMetricSection('Återhämtning', metrics.recovery)}
          {renderMetricSection('Sömn', metrics.sleep)}
          {renderMetricSection('Träning', metrics.workouts)}
          {renderMetricSection('Kroppsmått', metrics.bodyMeasurement, true)}
        </View>
      </ScrollView>
    </View>
  );
};
