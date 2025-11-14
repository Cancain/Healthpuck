const whoopTranslations = new Map<string, string>([
  ["score.strain", "Ansträngning"],
  ["score.kilojoule", "Energi (kJ)"],
  ["score.average_heart_rate", "Genomsnittlig hjärtfrekvens"],
  ["score.max_heart_rate", "Maximal hjärtfrekvens"],
  ["score.recovery_score", "Återhämtningspoäng"],
  ["score.resting_heart_rate", "Vilopuls"],
  ["score.hrv_rmssd_milli", "HRV RMSSD"],
  ["score.spo2_percentage", "Syrehalt (%)"],
  ["score.skin_temp_celsius", "Hudtemperatur"],
  ["score.respiratory_rate", "Andningsfrekvens"],
  ["score.sleep_performance_percentage", "Sömnprestanda (%)"],
  ["score.sleep_consistency_percentage", "Sömnkonsistens (%)"],
  ["score.sleep_efficiency_percentage", "Sömnens effektivitet (%)"],
  ["score.percent_recorded", "Procent inspelad"],
  ["score.heart_rate", "Hjärtfrekvens"],
  ["score.calorie", "Kalorier"],
  ["score.workout", "Träningspoäng"],
  ["score.zone_duration", "Zonvaraktighet"],
  ["score.zone_five_duration", "Zon 5 varaktighet"],
  ["score.zone_four_duration", "Zon 4 varaktighet"],
  ["score.zone_three_duration", "Zon 3 varaktighet"],
  ["score.zone_two_duration", "Zon 2 varaktighet"],
  ["score.zone_one_duration", "Zon 1 varaktighet"],
  ["strain", "Ansträngning"],
  ["kilojoule", "Energi (kJ)"],
  ["average_heart_rate", "Genomsnittlig hjärtfrekvens"],
  ["max_heart_rate", "Maximal hjärtfrekvens"],
  ["recovery_score", "Återhämtningspoäng"],
  ["resting_heart_rate", "Vilopuls"],
  ["hrv_rmssd_milli", "HRV RMSSD"],
  ["spo2_percentage", "Syrehalt (%)"],
  ["skin_temp_celsius", "Hudtemperatur"],
  ["respiratory_rate", "Andningsfrekvens"],
  ["sleep_performance_percentage", "Sömnprestanda (%)"],
  ["sleep_consistency_percentage", "Sömnkonsistens (%)"],
  ["sleep_efficiency_percentage", "Sömnens effektivitet (%)"],
  ["percent_recorded", "Procent inspelad"],
  ["heart_rate", "Hjärtfrekvens"],
  ["calorie", "Kalorier"],
  ["workout", "Träningspoäng"],
  ["height_meter", "Längd (m)"],
  ["weight_kilogram", "Vikt (kg)"],
  ["height", "Längd"],
  ["weight", "Vikt"],
  ["cycle_id", "Cykel-ID"],
  ["user_id", "Användar-ID"],
  ["sport_id", "Sport-ID"],
  ["id", "ID"],
  ["sleep_duration", "Sömnvaraktighet"],
  ["sleep_need", "Sömnbehov"],
  ["sleep_debt", "Sömnskuld"],
  ["sleep_performance", "Sömnprestanda"],
  ["sleep_consistency", "Sömnkonsistens"],
  ["sleep_efficiency", "Sömnens effektivitet"],
  ["awake_count", "Antal uppvaknanden"],
  ["awake_duration", "Vakentid"],
  ["light_sleep_duration", "Lätt sömn"],
  ["slow_wave_sleep_duration", "Djup sömn"],
  ["rem_sleep_duration", "REM-sömn"],
  ["in_bed_duration", "Tid i säng"],
  ["sleep_latency", "Sömnlatens"],
  ["sleep_need_baseline", "Sömnbehov (baslinje)"],
  ["sleep_need_from_sleep_debt", "Sömnbehov från sömnskuld"],
  ["sleep_need_from_recent_strain", "Sömnbehov från nylig ansträngning"],
  ["sleep_need_from_recent_nap", "Sömnbehov från nylig tupplur"],
  ["recovery", "Återhämtning"],
  ["hrv", "HRV"],
  ["hrv_rmssd", "HRV RMSSD"],
  ["spo2", "Syrehalt"],
  ["skin_temp", "Hudtemperatur"],
  ["resting_heart_rate_variability", "Vilopulsvariabilitet"],
  ["sport", "Sport"],
  ["sport_name", "Sportnamn"],
  ["duration", "Varaktighet"],
  ["distance", "Distans"],
  ["altitude", "Höjd"],
  ["pace", "Tempo"],
  ["power", "Effekt"],
  ["cadence", "Kadens"],
  ["zone_duration", "Zonvaraktighet"],
  ["zone_one_duration", "Zon 1 varaktighet"],
  ["zone_two_duration", "Zon 2 varaktighet"],
  ["zone_three_duration", "Zon 3 varaktighet"],
  ["zone_four_duration", "Zon 4 varaktighet"],
  ["zone_five_duration", "Zon 5 varaktighet"],
  ["cycle", "Cykel"],
  ["day", "Dag"],
]);

export function translateWhoopField(key: string): string {
  if (whoopTranslations.has(key)) {
    return whoopTranslations.get(key)!;
  }

  const parts = key.split(".");
  if (parts.length > 1) {
    const fullPath = key;
    if (whoopTranslations.has(fullPath)) {
      return whoopTranslations.get(fullPath)!;
    }

    const lastPart = parts[parts.length - 1];
    if (whoopTranslations.has(lastPart)) {
      return whoopTranslations.get(lastPart)!;
    }
  }

  if (whoopTranslations.has(key)) {
    return whoopTranslations.get(key)!;
  }

  return humanizeKey(key);
}

function humanizeKey(key: string): string {
  let cleaned = key.replace(/^(score|metrics|data)\./, "");
  const parts = cleaned.split(/[._]/);

  return parts
    .map((part) => {
      if (part !== part.toLowerCase()) {
        return part.replace(/([a-z])([A-Z])/g, "$1 $2");
      }
      return part;
    })
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
