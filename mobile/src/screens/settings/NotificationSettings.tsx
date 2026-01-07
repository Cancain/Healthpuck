import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Switch,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import {notificationService} from '../../services/notifications';
import type {NotificationPreferences} from '../../services/notifications';

export const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await notificationService.getNotificationPreferences();
      setPreferences(prefs);
    } catch (error: any) {
      Alert.alert(
        'Fel',
        error.message || 'Kunde inte hämta notifikationsinställningar',
      );
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    if (!preferences || saving) {
      return;
    }

    try {
      setSaving(true);
      const updated = await notificationService.updateNotificationPreferences({
        [key]: value,
      });
      setPreferences(updated);
    } catch (error: any) {
      Alert.alert('Fel', error.message || 'Kunde inte uppdatera inställningar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{color: '#666'}}>Inga inställningar hittades</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{flex: 1, backgroundColor: '#f5f5f5'}}>
      <View style={{padding: 20}}>
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#333',
              marginBottom: 16,
            }}>
            Notifikationer
          </Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#e0e0e0',
            }}>
            <View style={{flex: 1, marginRight: 16}}>
              <Text style={{fontSize: 16, fontWeight: '500', color: '#333'}}>
                Aktivera notifikationer
              </Text>
              <Text style={{fontSize: 12, color: '#666', marginTop: 4}}>
                Aktivera eller inaktivera alla varningsnotifikationer
              </Text>
            </View>
            <Switch
              value={preferences.alertsEnabled}
              onValueChange={value => updatePreference('alertsEnabled', value)}
              disabled={saving}
            />
          </View>

          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#666',
              marginBottom: 12,
              marginTop: 8,
            }}>
            Prioritet
          </Text>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <View style={{flex: 1, marginRight: 16}}>
              <Text style={{fontSize: 16, fontWeight: '500', color: '#333'}}>
                Hög prioritet
              </Text>
              <Text style={{fontSize: 12, color: '#666', marginTop: 4}}>
                Notifikationer för varningar med hög prioritet
              </Text>
            </View>
            <Switch
              value={preferences.highPriorityEnabled}
              onValueChange={value =>
                updatePreference('highPriorityEnabled', value)
              }
              disabled={saving || !preferences.alertsEnabled}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}>
            <View style={{flex: 1, marginRight: 16}}>
              <Text style={{fontSize: 16, fontWeight: '500', color: '#333'}}>
                Medel prioritet
              </Text>
              <Text style={{fontSize: 12, color: '#666', marginTop: 4}}>
                Notifikationer för varningar med medel prioritet
              </Text>
            </View>
            <Switch
              value={preferences.midPriorityEnabled}
              onValueChange={value =>
                updatePreference('midPriorityEnabled', value)
              }
              disabled={saving || !preferences.alertsEnabled}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}>
            <View style={{flex: 1, marginRight: 16}}>
              <Text style={{fontSize: 16, fontWeight: '500', color: '#333'}}>
                Låg prioritet
              </Text>
              <Text style={{fontSize: 12, color: '#666', marginTop: 4}}>
                Notifikationer för varningar med låg prioritet
              </Text>
            </View>
            <Switch
              value={preferences.lowPriorityEnabled}
              onValueChange={value =>
                updatePreference('lowPriorityEnabled', value)
              }
              disabled={saving || !preferences.alertsEnabled}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
