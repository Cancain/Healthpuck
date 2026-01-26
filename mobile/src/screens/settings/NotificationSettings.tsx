import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Switch,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {AuthorizationStatus} from '@react-native-firebase/messaging';
import {notificationService} from '../../services/notifications';
import type {NotificationPreferences} from '../../services/notifications';
import {colors} from '../../utils/theme';

export const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<number>(
    AuthorizationStatus.NOT_DETERMINED,
  );
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      setCheckingPermission(true);
      const status = await notificationService.checkPermissionStatus();
      setPermissionStatus(status);
    } catch (error) {
      console.error('[NotificationSettings] Error checking permission:', error);
    } finally {
      setCheckingPermission(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      setRequestingPermission(true);

      const granted = await notificationService.requestPermissions();
      await checkPermissionStatus();

      if (granted) {
        await notificationService.registerToken();
        Alert.alert(
          'Tillstånd beviljat',
          'Notifikationer är nu aktiverade. Du kommer att få varningar när de aktiveras.',
        );
      } else {
        const newStatus = await notificationService.checkPermissionStatus();
        if (newStatus === AuthorizationStatus.DENIED) {
          Alert.alert(
            'Tillstånd nekad',
            'För att aktivera notifikationer, öppna enhetsinställningarna och aktivera notifikationer för Healthpuck.',
            [
              {text: 'Avbryt', style: 'cancel'},
              {
                text: 'Öppna inställningar',
                onPress: async () => {
                  try {
                    await Linking.openSettings();
                    setTimeout(() => {
                      checkPermissionStatus();
                    }, 1000);
                  } catch (error) {
                    console.error(
                      '[NotificationSettings] Error opening settings:',
                      error,
                    );
                  }
                },
              },
            ],
          );
        }
      }
    } catch (error: any) {
      Alert.alert('Fel', error.message || 'Kunde inte begära tillstånd');
    } finally {
      setRequestingPermission(false);
    }
  };

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
        <ActivityIndicator size="large" color={colors.primary.dark} />
      </View>
    );
  }

  if (!preferences) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text style={{color: colors.primary.dark}}>
          Inga inställningar hittades
        </Text>
      </View>
    );
  }

  const isPermissionGranted =
    permissionStatus === AuthorizationStatus.AUTHORIZED ||
    permissionStatus === AuthorizationStatus.PROVISIONAL;
  const isPermissionDenied = permissionStatus === AuthorizationStatus.DENIED;

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case AuthorizationStatus.AUTHORIZED:
        return 'Beviljad';
      case AuthorizationStatus.PROVISIONAL:
        return 'Beviljad (provisoriskt)';
      case AuthorizationStatus.DENIED:
        return 'Nekad';
      case AuthorizationStatus.NOT_DETERMINED:
      default:
        return 'Inte bestämd';
    }
  };

  return (
    <ScrollView style={{flex: 1, backgroundColor: colors.primary.background}}>
      <View style={{padding: 20}}>
        {!isPermissionGranted && (
          <View
            style={{
              backgroundColor: isPermissionDenied ? '#FFF3CD' : '#D1ECF1',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: isPermissionDenied
                ? '#FFC107'
                : colors.primary.dark,
            }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: colors.primary.dark,
                marginBottom: 8,
              }}>
              Enhetstillstånd för notifikationer
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.primary.dark,
                marginBottom: 12,
              }}>
              Status: {getPermissionStatusText()}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.primary.dark,
                marginBottom: 12,
              }}>
              {isPermissionDenied
                ? 'Aktivera notifikationer för att få varningar när de aktiveras.'
                : 'Aktivera notifikationer för att få varningar när de aktiveras.'}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary.dark,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
                marginTop: 8,
                marginBottom: 8,
              }}
              onPress={handleRequestPermission}
              disabled={requestingPermission || checkingPermission}>
              {requestingPermission ? (
                <ActivityIndicator color={colors.semantic.white} />
              ) : (
                <Text
                  style={{
                    color: colors.semantic.white,
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                  {isPermissionDenied
                    ? 'Öppna inställningar'
                    : 'Begär tillstånd för notifikationer'}
                </Text>
              )}
            </TouchableOpacity>
            {isPermissionDenied && (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary.dark,
                  fontStyle: 'italic',
                }}>
                Om knappen inte öppnar inställningarna, gå manuellt till
                Enhetsinställningar → Appar → Healthpuck → Notifikationer.
              </Text>
            )}
          </View>
        )}

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
              color: colors.primary.dark,
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
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: colors.primary.dark,
                }}>
                Aktivera notifikationer
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary.dark,
                  marginTop: 4,
                }}>
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
              color: colors.primary.dark,
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
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: colors.primary.dark,
                }}>
                Hög prioritet
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary.dark,
                  marginTop: 4,
                }}>
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
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: colors.primary.dark,
                }}>
                Medel prioritet
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary.dark,
                  marginTop: 4,
                }}>
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
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: colors.primary.dark,
                }}>
                Låg prioritet
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.primary.dark,
                  marginTop: 4,
                }}>
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
