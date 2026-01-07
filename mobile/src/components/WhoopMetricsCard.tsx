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
      if (results.length >= 15 || depth >= 4) {
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

      const entries = Object.entries(obj);
      const scoreEntry = entries.find(([key]) => key === 'score');
      const otherEntries = entries.filter(([key]) => key !== 'score');

      if (scoreEntry) {
        const [key, value] = scoreEntry;
        const nextPath = path ? `${path}.${key}` : key;
        visit(value, nextPath, depth + 1);
      }

      for (const [key, value] of otherEntries) {
        if (results.length >= 15) {
          break;
        }
        const nextPath = path ? `${path}.${key}` : key;
        visit(value, nextPath, depth + 1);
      }
    };

    visit(payload, '', 0);
    return results;
  };

  const findLatest = (payload: unknown) => {
    if (!payload) {
      return null;
    }

    if (Array.isArray(payload)) {
      if (payload.length > 0) {
        return payload[payload.length - 1];
      }
      return null;
    }

    if (typeof payload === 'object' && payload !== null) {
      const obj = payload as Record<string, unknown>;
      if (Array.isArray(obj.records)) {
        if (obj.records.length > 0) {
          return obj.records[obj.records.length - 1];
        }
        return null;
      }
      if (Array.isArray(obj.data)) {
        if (obj.data.length > 0) {
          return obj.data[obj.data.length - 1];
        }
        return null;
      }
      return obj;
    }

    return null;
  };

  const translateField = (field: string): string => {
    const whoopTranslations = new Map<string, string>([
      ['score.strain', 'Ansträngning'],
      ['score.kilojoule', 'Energi (kJ)'],
      ['score.average_heart_rate', 'Genomsnittlig hjärtfrekvens'],
      ['score.max_heart_rate', 'Maximal hjärtfrekvens'],
      ['score.recovery_score', 'Återhämtningspoäng'],
      ['score.resting_heart_rate', 'Vilopuls'],
      ['score.hrv_rmssd_milli', 'HRV RMSSD'],
      ['score.spo2_percentage', 'Syrehalt (%)'],
      ['score.skin_temp_celsius', 'Hudtemperatur'],
      ['score.respiratory_rate', 'Andningsfrekvens'],
      ['score.sleep_performance_percentage', 'Sömnprestanda (%)'],
      ['score.sleep_consistency_percentage', 'Sömnkonsistens (%)'],
      ['score.sleep_efficiency_percentage', 'Sömnens effektivitet (%)'],
      ['score.st', 'Sömnvaraktighet'],
      ['score.sl', 'Sömnlatens'],
      ['score.re', 'REM-sömn'],
      ['score.aw', 'Vakentid'],
      ['score.ls', 'Lätt sömn'],
      ['score.sws', 'Djup sömn'],
      ['score.ib', 'Tid i säng'],
      ['score.sn', 'Sömnbehov'],
      ['score.sd', 'Sömnskuld'],
      ['st', 'Sömnvaraktighet'],
      ['sl', 'Sömnlatens'],
      ['re', 'REM-sömn'],
      ['aw', 'Vakentid'],
      ['ls', 'Lätt sömn'],
      ['sws', 'Djup sömn'],
      ['ib', 'Tid i säng'],
      ['sn', 'Sömnbehov'],
      ['sd', 'Sömnskuld'],
      ['score.percent_recorded', 'Procent inspelad'],
      ['score.heart_rate', 'Hjärtfrekvens'],
      ['score.calorie', 'Kalorier'],
      ['score.workout', 'Träningspoäng'],
      ['score.zone_duration', 'Zonvaraktighet'],
      ['score.zone_five_duration', 'Zon 5 varaktighet'],
      ['score.zone_four_duration', 'Zon 4 varaktighet'],
      ['score.zone_three_duration', 'Zon 3 varaktighet'],
      ['score.zone_two_duration', 'Zon 2 varaktighet'],
      ['score.zone_one_duration', 'Zon 1 varaktighet'],
      ['strain', 'Ansträngning'],
      ['kilojoule', 'Energi (kJ)'],
      ['average_heart_rate', 'Genomsnittlig hjärtfrekvens'],
      ['max_heart_rate', 'Maximal hjärtfrekvens'],
      ['recovery_score', 'Återhämtningspoäng'],
      ['resting_heart_rate', 'Vilopuls'],
      ['hrv_rmssd_milli', 'HRV RMSSD'],
      ['spo2_percentage', 'Syrehalt (%)'],
      ['skin_temp_celsius', 'Hudtemperatur'],
      ['respiratory_rate', 'Andningsfrekvens'],
      ['sleep_performance_percentage', 'Sömnprestanda (%)'],
      ['sleep_consistency_percentage', 'Sömnkonsistens (%)'],
      ['sleep_efficiency_percentage', 'Sömnens effektivitet (%)'],
      ['score.st', 'Sömnvaraktighet'],
      ['score.sl', 'Sömnlatens'],
      ['score.re', 'REM-sömn'],
      ['score.aw', 'Vakentid'],
      ['score.ls', 'Lätt sömn'],
      ['score.sws', 'Djup sömn'],
      ['score.ib', 'Tid i säng'],
      ['score.sn', 'Sömnbehov'],
      ['score.sd', 'Sömnskuld'],
      ['percent_recorded', 'Procent inspelad'],
      ['heart_rate', 'Hjärtfrekvens'],
      ['calorie', 'Kalorier'],
      ['workout', 'Träningspoäng'],
      ['height_meter', 'Längd (m)'],
      ['weight_kilogram', 'Vikt (kg)'],
      ['height', 'Längd'],
      ['weight', 'Vikt'],
      ['cycle_id', 'Cykel-ID'],
      ['user_id', 'Användar-ID'],
      ['sport_id', 'Sport-ID'],
      ['id', 'ID'],
      ['sleep_duration', 'Sömnvaraktighet'],
      ['sleep_need', 'Sömnbehov'],
      ['sleep_debt', 'Sömnskuld'],
      ['sleep_performance', 'Sömnprestanda'],
      ['sleep_consistency', 'Sömnkonsistens'],
      ['sleep_efficiency', 'Sömnens effektivitet'],
      ['awake_count', 'Antal uppvaknanden'],
      ['awake_duration', 'Vakentid'],
      ['light_sleep_duration', 'Lätt sömn'],
      ['slow_wave_sleep_duration', 'Djup sömn'],
      ['rem_sleep_duration', 'REM-sömn'],
      ['in_bed_duration', 'Tid i säng'],
      ['sleep_latency', 'Sömnlatens'],
      ['sleep_need_baseline', 'Sömnbehov (baslinje)'],
      ['sleep_need_from_sleep_debt', 'Sömnbehov från sömnskuld'],
      ['sleep_need_from_recent_strain', 'Sömnbehov från nylig ansträngning'],
      ['sleep_need_from_recent_nap', 'Sömnbehov från nylig tupplur'],
      ['stage_summary.total_in_bed_time_milli', 'Tid i säng (ms)'],
      ['stage_summary.total_awake_time_milli', 'Vakentid (ms)'],
      ['stage_summary.total_no_data_time_milli', 'Ingen data (ms)'],
      ['stage_summary.total_light_sleep_time_milli', 'Lätt sömn (ms)'],
      ['stage_summary.total_slow_wave_sleep_time_milli', 'Djup sömn (ms)'],
      ['stage_summary.total_rem_sleep_time_milli', 'REM-sömn (ms)'],
      ['stage_summary.sleep_cycle_count', 'Sömncykler'],
      ['stage_summary.disturbance_count', 'Störningar'],
      ['sleep_needed.baseline_milli', 'Sömnbehov (baslinje) (ms)'],
      [
        'sleep_needed.need_from_sleep_debt_milli',
        'Sömnbehov från sömnskuld (ms)',
      ],
      [
        'sleep_needed.need_from_recent_strain_milli',
        'Sömnbehov från nylig ansträngning (ms)',
      ],
      [
        'sleep_needed.need_from_recent_nap_milli',
        'Sömnbehov från nylig tupplur (ms)',
      ],
      ['stage_summary_total_in_bed_time_milli', 'Tid i säng (ms)'],
      ['stage_summary_total_awake_time_milli', 'Vakentid (ms)'],
      ['stage_summary_total_no_data_time_milli', 'Ingen data (ms)'],
      ['stage_summary_total_light_sleep_time_milli', 'Lätt sömn (ms)'],
      ['stage_summary_total_slow_wave_sleep_time_milli', 'Djup sömn (ms)'],
      ['stage_summary_total_rem_sleep_time_milli', 'REM-sömn (ms)'],
      ['stage_summary_sleep_cycle_count', 'Sömncykler'],
      ['stage_summary_disturbance_count', 'Störningar'],
      ['sleep_needed_baseline_milli', 'Sömnbehov (baslinje) (ms)'],
      [
        'sleep_needed_need_from_sleep_debt_milli',
        'Sömnbehov från sömnskuld (ms)',
      ],
      [
        'sleep_needed_need_from_recent_strain_milli',
        'Sömnbehov från nylig ansträngning (ms)',
      ],
      [
        'sleep_needed_need_from_recent_nap_milli',
        'Sömnbehov från nylig tupplur (ms)',
      ],
      ['total_in_bed_time_milli', 'Tid i säng (ms)'],
      ['total_awake_time_milli', 'Vakentid (ms)'],
      ['total_no_data_time_milli', 'Ingen data (ms)'],
      ['total_light_sleep_time_milli', 'Lätt sömn (ms)'],
      ['total_slow_wave_sleep_time_milli', 'Djup sömn (ms)'],
      ['total_rem_sleep_time_milli', 'REM-sömn (ms)'],
      ['sleep_cycle_count', 'Sömncykler'],
      ['disturbance_count', 'Störningar'],
      ['baseline_milli', 'Baslinje (ms)'],
      ['need_from_sleep_debt_milli', 'Från sömnskuld (ms)'],
      ['need_from_recent_strain_milli', 'Från nylig ansträngning (ms)'],
      ['need_from_recent_nap_milli', 'Från nylig tupplur (ms)'],
      ['recovery', 'Återhämtning'],
      ['hrv', 'HRV'],
      ['hrv_rmssd', 'HRV RMSSD'],
      ['spo2', 'Syrehalt'],
      ['skin_temp', 'Hudtemperatur'],
      ['resting_heart_rate_variability', 'Vilopulsvariabilitet'],
      ['sport', 'Sport'],
      ['sport_name', 'Sportnamn'],
      ['duration', 'Varaktighet'],
      ['distance', 'Distans'],
      ['altitude', 'Höjd'],
      ['pace', 'Tempo'],
      ['power', 'Effekt'],
      ['cadence', 'Kadens'],
      ['zone_duration', 'Zonvaraktighet'],
      ['zone_one_duration', 'Zon 1 varaktighet'],
      ['zone_two_duration', 'Zon 2 varaktighet'],
      ['zone_three_duration', 'Zon 3 varaktighet'],
      ['zone_four_duration', 'Zon 4 varaktighet'],
      ['zone_five_duration', 'Zon 5 varaktighet'],
      ['cycle', 'Cykel'],
      ['day', 'Dag'],
    ]);

    if (whoopTranslations.has(field)) {
      return whoopTranslations.get(field)!;
    }

    const parts = field.split('.');
    if (parts.length > 1) {
      const fullPath = field;
      if (whoopTranslations.has(fullPath)) {
        return whoopTranslations.get(fullPath)!;
      }

      const lastPart = parts[parts.length - 1];
      if (whoopTranslations.has(lastPart)) {
        return whoopTranslations.get(lastPart)!;
      }
    }

    const humanizeKey = (key: string): string => {
      let cleaned = key.replace(/^(score|metrics|data)\./, '');
      const keyParts = cleaned.split(/[._]/);

      return keyParts
        .map(part => {
          if (part !== part.toLowerCase()) {
            return part.replace(/([a-z])([A-Z])/g, '$1 $2');
          }
          return part;
        })
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    };

    return humanizeKey(field);
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

    const keysToHide = [
      'id',
      'user_id',
      'sport_id',
      'cycle_id',
      'sleep_id',
      'score.percent_recorded',
      'created_at',
      'updated_at',
      'start',
      'end',
      'timezone_offset',
      'v1_id',
    ];

    const visibleMetrics = metricPairs.filter(
      ([key]) => !keysToHide.includes(key),
    );

    if (visibleMetrics.length === 0) {
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
        {visibleMetrics.map(([key, value]) => (
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
        ))}
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
