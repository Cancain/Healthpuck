import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, TouchableOpacity} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {useAuth} from '../contexts/AuthContext';
import {UsersSettings} from './settings/UsersSettings';
import {MedicationsSettings} from './settings/MedicationsSettings';
import {AlertsSettings} from './settings/AlertsSettings';
import {WhoopSettings} from './settings/WhoopSettings';
import {NotificationSettings} from './settings/NotificationSettings';
import {colors} from '../utils/theme';

type Tab = 'users' | 'medications' | 'alerts' | 'whoop' | 'notifications';

export const SettingsScreen: React.FC = () => {
  const route = useRoute();
  const {logout} = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('alerts');
  const [initialPatientId, setInitialPatientId] = useState<
    number | undefined
  >();

  useEffect(() => {
    const params = route.params as {patientId?: number} | undefined;
    if (params?.patientId) {
      setInitialPatientId(params.patientId);
      setActiveTab('alerts');
    }
  }, [route.params]);

  const tabs: Array<{id: Tab; label: string}> = [
    {id: 'users', label: 'Användare'},
    {id: 'medications', label: 'Mediciner'},
    {id: 'alerts', label: 'Varningar'},
    {id: 'whoop', label: 'Whoop'},
    {id: 'notifications', label: 'Notifikationer'},
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersSettings />;
      case 'medications':
        return <MedicationsSettings />;
      case 'alerts':
        return <AlertsSettings initialPatientId={initialPatientId} />;
      case 'whoop':
        return <WhoopSettings />;
      case 'notifications':
        return <NotificationSettings />;
      default:
        return null;
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.primary.background}}>
      <View
        style={{
          backgroundColor: '#fff',
          padding: 20,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
        }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.primary.dark,
          }}>
          Inställningar
        </Text>
        <TouchableOpacity onPress={logout} style={{padding: 8}}>
          <Text style={{color: '#F44336', fontSize: 16, fontWeight: '600'}}>
            Logga ut
          </Text>
        </TouchableOpacity>
      </View>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
        }}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              {
                flex: 1,
                paddingVertical: 12,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: 'transparent',
              },
              activeTab === tab.id && {borderBottomColor: colors.primary.dark},
            ]}
            onPress={() => setActiveTab(tab.id)}>
            <Text
              style={[
                {fontSize: 14, color: '#666', fontWeight: '500'},
                activeTab === tab.id && {
                  color: colors.primary.dark,
                  fontWeight: '600',
                },
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={{flex: 1}}>{renderContent()}</ScrollView>
    </View>
  );
};
