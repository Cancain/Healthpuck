import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {apiService} from '../../services/api';
import {usePatient} from '../../contexts/PatientContext';
import type {WhoopStatus} from '../../types/api';

export const WhoopSettings: React.FC = () => {
  const {patient} = usePatient();
  const [whoopStatus, setWhoopStatus] = useState<WhoopStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    loadWhoopStatus();
  }, []);

  const loadWhoopStatus = async () => {
    try {
      setLoading(true);
      const status = await apiService.getWhoopStatus();
      setWhoopStatus(status);
    } catch (error: any) {
      console.error('Error loading Whoop status:', error);
      setWhoopStatus({connected: false});
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const {url} = await apiService.getWhoopConnectUrl();
      console.log('Opening Whoop URL in WebView:', url);
      setOauthUrl(url);
    } catch (error: any) {
      console.error('Error getting Whoop connect URL:', error);
      Alert.alert(
        'Fel',
        error.message || 'Kunde inte hämta Whoop-anslutnings-URL',
      );
      setConnecting(false);
    }
  };

  const parseQueryParams = (url: string): Record<string, string> => {
    const params: Record<string, string> = {};
    const queryString = url.split('?')[1];
    if (!queryString) {
      return params;
    }

    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
    return params;
  };

  const handleNavigationStateChange = async (navState: any) => {
    const {url} = navState;
    console.log('WebView navigation:', url);

    if (url.includes('/api/integrations/whoop/callback')) {
      webViewRef.current?.stopLoading();

      try {
        const params = parseQueryParams(url);
        const code = params.code;
        const state = params.state;
        const error = params.error;

        if (error) {
          const errorDescription = params.error_description || 'Okänt fel';
          setOauthUrl(null);
          setConnecting(false);
          Alert.alert(
            'Fel',
            `Whoop-anslutning misslyckades: ${errorDescription}`,
          );
          return;
        }

        if (code && state) {
          setOauthUrl(null);

          const redirectUri = url.split('?')[0];
          try {
            await apiService.exchangeWhoopCode(code, state, redirectUri);
            Alert.alert('Lyckades', 'Whoop-anslutning etablerad');
            await loadWhoopStatus();
          } catch (exchangeError: any) {
            console.error('Error exchanging Whoop code:', exchangeError);
            Alert.alert(
              'Fel',
              exchangeError.message || 'Kunde inte slutföra Whoop-anslutning',
            );
          } finally {
            setConnecting(false);
          }
        }
      } catch (urlError) {
        console.error('Error parsing callback URL:', urlError);
        setOauthUrl(null);
        setConnecting(false);
        Alert.alert('Fel', 'Kunde inte tolka OAuth-svar');
      }
    }
  };

  const handleCloseWebView = () => {
    setOauthUrl(null);
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Ta bort Whoop-anslutning',
      'Är du säker på att du vill ta bort Whoop-anslutningen? Detta kommer att stoppa all data-synkronisering.',
      [
        {text: 'Avbryt', style: 'cancel'},
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            setDisconnecting(true);
            try {
              await apiService.disconnectWhoop();
              Alert.alert('Lyckades', 'Whoop-anslutning borttagen');
              await loadWhoopStatus();
            } catch (error: any) {
              Alert.alert(
                'Fel',
                error.message || 'Kunde inte ta bort Whoop-anslutning',
              );
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ],
    );
  };

  const formatDate = (value?: string | null) => {
    if (!value) {
      return '-';
    }
    try {
      const date = new Date(value);
      return date.toLocaleString('sv-SE');
    } catch {
      return value;
    }
  };

  const translateScope = (scope: string) => {
    return scope
      .split(' ')
      .map(s => {
        const translations: Record<string, string> = {
          read: 'Läs',
          write: 'Skriv',
          recovery: 'Återhämtning',
          workout: 'Träning',
          sleep: 'Sömn',
          profile: 'Profil',
        };
        return translations[s] || s;
      })
      .join(', ');
  };

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={{flex: 1, padding: 20}}>
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
        }}>
        <View style={{marginBottom: 16}}>
          <View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#333',
                marginBottom: 8,
              }}>
              Whoop-integration
            </Text>
            <Text style={{fontSize: 14, color: '#666', lineHeight: 20}}>
              Koppla patientens Whoop-konto för att synkronisera data. Du
              omdirigeras till Whoop för att logga in och godkänna åtkomst.
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
          }}>
          <View
            style={{flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap'}}>
            <Text
              style={{
                fontSize: 14,
                color: '#666',
                marginRight: 8,
                minWidth: 120,
              }}>
              Status:
            </Text>
            <Text
              style={[
                {fontSize: 14, fontWeight: '600', color: '#333', flex: 1},
                whoopStatus?.connected ? {color: '#4CAF50'} : {color: '#999'},
              ]}>
              {whoopStatus?.connected ? 'Ansluten' : 'Inte ansluten'}
            </Text>
          </View>
          <View
            style={{flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap'}}>
            <Text
              style={{
                fontSize: 14,
                color: '#666',
                marginRight: 8,
                minWidth: 120,
              }}>
              Patient:
            </Text>
            <Text
              style={{fontSize: 14, fontWeight: '600', color: '#333', flex: 1}}>
              {whoopStatus?.patientName ||
                (whoopStatus?.patientId ? `ID ${whoopStatus.patientId}` : '-')}
            </Text>
          </View>
          {whoopStatus?.connected && (
            <>
              {whoopStatus.whoopUserId && (
                <View
                  style={{
                    flexDirection: 'row',
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#666',
                      marginRight: 8,
                      minWidth: 120,
                    }}>
                    Whoop-användar-ID:
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#333',
                      flex: 1,
                    }}>
                    {whoopStatus.whoopUserId}
                  </Text>
                </View>
              )}
              {whoopStatus.scope && (
                <View
                  style={{
                    flexDirection: 'row',
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#666',
                      marginRight: 8,
                      minWidth: 120,
                    }}>
                    Behörigheter:
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#333',
                      flex: 1,
                    }}>
                    {translateScope(whoopStatus.scope)}
                  </Text>
                </View>
              )}
              {whoopStatus.expiresAt && (
                <View
                  style={{
                    flexDirection: 'row',
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#666',
                      marginRight: 8,
                      minWidth: 120,
                    }}>
                    Token går ut:
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#333',
                      flex: 1,
                    }}>
                    {formatDate(whoopStatus.expiresAt)}
                  </Text>
                </View>
              )}
              {whoopStatus.lastSyncedAt && (
                <View
                  style={{
                    flexDirection: 'row',
                    marginBottom: 8,
                    flexWrap: 'wrap',
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: '#666',
                      marginRight: 8,
                      minWidth: 120,
                    }}>
                    Senast synkad:
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#333',
                      flex: 1,
                    }}>
                    {formatDate(whoopStatus.lastSyncedAt)}
                  </Text>
                </View>
              )}
            </>
          )}
          {!whoopStatus?.connected && (
            <Text
              style={{
                fontSize: 12,
                color: '#666',
                fontStyle: 'italic',
                marginTop: 12,
                lineHeight: 18,
              }}>
              Ingen Whoop-anslutning funnen för patienten. Klicka på "Koppla
              Whoop" för att logga in på patientens Whoop-konto. Anslutningen
              delas automatiskt med alla omsorgsgivare.
            </Text>
          )}
        </View>

        <View style={{flexDirection: 'row', gap: 12, marginTop: 16}}>
          {whoopStatus?.connected && (
            <TouchableOpacity
              style={[
                {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
                {backgroundColor: '#9E9E9E'},
              ]}
              onPress={handleDisconnect}
              disabled={disconnecting || connecting}>
              {disconnecting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                  Ta bort
                </Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
              {backgroundColor: '#007AFF'},
            ]}
            onPress={handleConnect}
            disabled={connecting || disconnecting}>
            {connecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                {whoopStatus?.connected ? 'Återanslut' : 'Koppla Whoop'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {patient?.role === 'patient' && (
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
              marginBottom: 8,
            }}>
            Bluetooth-anslutning
          </Text>
          <Text style={{fontSize: 14, color: '#666', lineHeight: 20}}>
            Anslut direkt till Whoop-enheten via Bluetooth för realtidsdata om
            hjärtfrekvens. Gå till Dashboard för att ansluta.
          </Text>
        </View>
      )}

      <Modal
        visible={!!oauthUrl}
        animationType="slide"
        onRequestClose={handleCloseWebView}>
        <View style={{flex: 1}}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              backgroundColor: '#f5f5f5',
              borderBottomWidth: 1,
              borderBottomColor: '#e0e0e0',
            }}>
            <Text style={{fontSize: 18, fontWeight: '600'}}>
              Anslut till Whoop
            </Text>
            <TouchableOpacity onPress={handleCloseWebView}>
              <Text style={{fontSize: 16, color: '#007AFF'}}>Stäng</Text>
            </TouchableOpacity>
          </View>
          {oauthUrl && (
            <WebView
              ref={webViewRef}
              source={{uri: oauthUrl}}
              onNavigationStateChange={handleNavigationStateChange}
              onShouldStartLoadWithRequest={request => {
                if (request.url.includes('/api/integrations/whoop/callback')) {
                  handleNavigationStateChange({url: request.url});
                  return false; // Prevent loading
                }
                return true; // Allow other navigation
              }}
              startInLoadingState={true}
              renderLoading={() => (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                  <ActivityIndicator size="large" color="#007AFF" />
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
};
