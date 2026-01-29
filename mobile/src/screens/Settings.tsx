import React, {useState, useEffect, useMemo} from 'react';
import {View, Text, ScrollView, TouchableOpacity} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import type {IconProp} from '@fortawesome/fontawesome-svg-core';
import {
  faBuilding,
  faPills,
  faTriangleExclamation,
  faHeartPulse,
  faBell,
} from '@fortawesome/free-solid-svg-icons';
import {useAuth} from '../contexts/AuthContext';
import {usePatient} from '../contexts/PatientContext';
import {OrganisationSettings} from './settings/OrganisationSettings';
import {MedicationsSettings} from './settings/MedicationsSettings';
import {AlertsSettings} from './settings/AlertsSettings';
import {WhoopSettings} from './settings/WhoopSettings';
import {NotificationSettings} from './settings/NotificationSettings';
import {colors} from '../utils/theme';

type Tab =
  | 'organisation'
  | 'medications'
  | 'alerts'
  | 'whoop'
  | 'notifications';

const SETTINGS_TAB_ICON_SIZE = 22;

const ALL_TABS: Array<{id: Tab; label: string; icon: IconProp}> = [
  {id: 'organisation', label: 'Organisation', icon: faBuilding as IconProp},
  {id: 'medications', label: 'Mediciner', icon: faPills as IconProp},
  {id: 'alerts', label: 'Varningar', icon: faTriangleExclamation as IconProp},
  {id: 'whoop', label: 'Whoop', icon: faHeartPulse as IconProp},
  {id: 'notifications', label: 'Notifikationer', icon: faBell as IconProp},
];

export const SettingsScreen: React.FC = () => {
  const route = useRoute();
  const {logout} = useAuth();
  const {isCaretakerRole, isPatientRole} = usePatient();
  const [activeTab, setActiveTab] = useState<Tab>('alerts');
  const [initialPatientId, setInitialPatientId] = useState<
    number | undefined
  >();

  const tabs = useMemo(
    () =>
      ALL_TABS.filter(t => {
        if (t.id === 'whoop') {
          return isPatientRole;
        }
        if (t.id === 'organisation') {
          return isCaretakerRole && !isPatientRole;
        }
        return true;
      }),
    [isCaretakerRole, isPatientRole],
  );

  useEffect(() => {
    const params = route.params as {patientId?: number} | undefined;
    if (params?.patientId) {
      setInitialPatientId(params.patientId);
      setActiveTab('alerts');
    }
  }, [route.params]);

  useEffect(() => {
    if (!isPatientRole && activeTab === 'whoop') {
      setActiveTab('alerts');
    }
    if (!(isCaretakerRole && !isPatientRole) && activeTab === 'organisation') {
      setActiveTab('alerts');
    }
  }, [isCaretakerRole, isPatientRole, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'organisation':
        return <OrganisationSettings />;
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
          backgroundColor: colors.primary.background,
        }}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              {
                borderRadius: 3,
                flex: 1,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomWidth: 2,
                borderLeftWidth: 1,
                borderLeftColor: '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#e0e0e0',
                borderBottomColor: '#e0e0e0',
                backgroundColor: '#fff',
              },
              activeTab === tab.id && {
                borderBottomColor: colors.primary.dark,
                backgroundColor: colors.primary.background,
              },
            ]}
            onPress={() => setActiveTab(tab.id)}>
            <FontAwesomeIcon
              icon={tab.icon}
              size={SETTINGS_TAB_ICON_SIZE}
              color={activeTab === tab.id ? colors.primary.dark : '#666'}
            />
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={{flex: 1}}>{renderContent()}</ScrollView>
    </View>
  );
};
