import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {apiService} from '../../services/api';
import {usePatient} from '../../contexts/PatientContext';
import type {Patient} from '../../types/api';
import HPTextInput from '../../components/HPTextInput';
import {colors} from '../../utils/theme';

type OrganisationSubTab = 'patients' | 'caregivers' | 'organisation-settings';

const SUB_TABS: Array<{id: OrganisationSubTab; label: string}> = [
  {id: 'patients', label: 'Omsorgstagare'},
  {id: 'caregivers', label: 'Omsorgsgivare'},
  {id: 'organisation-settings', label: 'Organisationsinställningar'},
];

export const OrganisationSettings: React.FC = () => {
  const {organisation, refreshPatient} = usePatient();
  const [subTab, setSubTab] = useState<OrganisationSubTab>('patients');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [patientConfirmPassword, setPatientConfirmPassword] = useState('');
  const [creatingPatient, setCreatingPatient] = useState(false);

  const [caregivers, setCaregivers] = useState<
    Array<{id: number; name: string; email: string}>
  >([]);
  const [caregiversLoading, setCaregiversLoading] = useState(true);
  const [showCreateCaregiver, setShowCreateCaregiver] = useState(false);
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [caregiverPassword, setCaregiverPassword] = useState('');
  const [creatingCaregiver, setCreatingCaregiver] = useState(false);

  const [orgName, setOrgName] = useState(organisation?.organisationName ?? '');
  const [orgSaving, setOrgSaving] = useState(false);

  const loadPatients = useCallback(async () => {
    try {
      setPatientsLoading(true);
      const data = await apiService.getOrganisationPatients();
      setPatients(data);
    } catch (error: any) {
      Alert.alert('Fel', error.message || 'Kunde inte hämta omsorgstagare');
      setPatients([]);
    } finally {
      setPatientsLoading(false);
    }
  }, []);

  const loadCaregivers = useCallback(async () => {
    try {
      setCaregiversLoading(true);
      const data = await apiService.getOrganisationCaretakers();
      setCaregivers(data);
    } catch (error: any) {
      Alert.alert('Fel', error.message || 'Kunde inte hämta omsorgsgivare');
      setCaregivers([]);
    } finally {
      setCaregiversLoading(false);
    }
  }, []);

  useEffect(() => {
    if (organisation) {
      setOrgName(organisation.organisationName);
    }
  }, [organisation?.organisationName, organisation]);

  useEffect(() => {
    if (subTab === 'patients') {
      loadPatients();
    } else if (subTab === 'caregivers') {
      loadCaregivers();
    }
  }, [subTab, loadPatients, loadCaregivers]);

  const handleCreatePatient = async () => {
    if (
      !patientName.trim() ||
      !patientEmail.trim() ||
      !patientPassword.trim()
    ) {
      Alert.alert('Fel', 'Vänligen fyll i alla fält');
      return;
    }
    if (patientPassword.length < 8) {
      Alert.alert('Fel', 'Lösenordet måste vara minst 8 tecken');
      return;
    }
    if (patientPassword !== patientConfirmPassword) {
      Alert.alert('Fel', 'Lösenorden matchar inte');
      return;
    }
    setCreatingPatient(true);
    try {
      await apiService.createPatient(
        patientName.trim(),
        patientEmail.trim(),
        patientPassword,
      );
      Alert.alert('Lyckades', 'Omsorgstagare skapad');
      setPatientName('');
      setPatientEmail('');
      setPatientPassword('');
      setPatientConfirmPassword('');
      setShowCreatePatient(false);
      await loadPatients();
      await refreshPatient();
    } catch (error: any) {
      Alert.alert('Fel', error.message || 'Kunde inte skapa omsorgstagare');
    } finally {
      setCreatingPatient(false);
    }
  };

  const handleDeletePatient = (patientId: number, name: string) => {
    Alert.alert(
      'Ta bort omsorgstagare',
      `Är du säker på att du vill ta bort ${name}? Detta kommer att ta bort alla data kopplade till denna omsorgstagare.`,
      [
        {text: 'Avbryt', style: 'cancel'},
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deletePatient(patientId);
              Alert.alert('Lyckades', 'Omsorgstagare borttagen');
              await loadPatients();
              await refreshPatient();
            } catch (error: any) {
              Alert.alert(
                'Fel',
                error.message || 'Kunde inte ta bort omsorgstagare',
              );
            }
          },
        },
      ],
    );
  };

  const handleCreateCaregiver = async () => {
    if (
      !caregiverName.trim() ||
      !caregiverEmail.trim() ||
      !caregiverPassword.trim()
    ) {
      Alert.alert('Fel', 'Vänligen fyll i alla fält');
      return;
    }
    if (caregiverPassword.length < 8) {
      Alert.alert('Fel', 'Lösenordet måste vara minst 8 tecken');
      return;
    }
    setCreatingCaregiver(true);
    try {
      const result = await apiService.inviteUsersToOrganisation([
        {
          name: caregiverName.trim(),
          email: caregiverEmail.trim(),
          password: caregiverPassword,
          role: 'caregiver',
        },
      ]);
      if (result.errors.length > 0) {
        Alert.alert(
          'Fel',
          result.errors.map(e => `${e.email}: ${e.error}`).join('\n'),
        );
      } else {
        Alert.alert('Lyckades', 'Omsorgsgivare tillagd');
        setCaregiverName('');
        setCaregiverEmail('');
        setCaregiverPassword('');
        setShowCreateCaregiver(false);
        await loadCaregivers();
      }
    } catch (error: any) {
      Alert.alert(
        'Fel',
        error.message || 'Kunde inte lägga till omsorgsgivare',
      );
    } finally {
      setCreatingCaregiver(false);
    }
  };

  const handleSaveOrgName = async () => {
    const trimmed = orgName.trim();
    if (!trimmed) {
      Alert.alert('Fel', 'Organisationsnamn krävs');
      return;
    }
    setOrgSaving(true);
    try {
      await apiService.updateOrganisation(trimmed);
      Alert.alert('Lyckades', 'Organisationsnamn sparad');
      await refreshPatient();
    } catch (error: any) {
      Alert.alert('Fel', error.message || 'Kunde inte spara organisationsnamn');
    } finally {
      setOrgSaving(false);
    }
  };

  const renderPatientsContent = () => {
    if (patientsLoading) {
      return (
        <View style={{flex: 1, justifyContent: 'center', padding: 40}}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }
    return (
      <ScrollView style={{flex: 1, padding: 20}}>
        {!showCreatePatient ? (
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              borderRadius: 8,
              padding: 16,
              alignItems: 'center',
              marginBottom: 20,
            }}
            onPress={() => setShowCreatePatient(true)}>
            <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
              Lägg till
            </Text>
          </TouchableOpacity>
        ) : (
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
            }}>
            <HPTextInput
              placeholder="Namn *"
              value={patientName}
              onChangeText={setPatientName}
              editable={!creatingPatient}
            />
            <HPTextInput
              placeholder="E-post *"
              value={patientEmail}
              onChangeText={setPatientEmail}
              editable={!creatingPatient}
            />
            <HPTextInput
              placeholder="Lösenord (minst 8 tecken) *"
              value={patientPassword}
              onChangeText={setPatientPassword}
              secureTextEntry
              editable={!creatingPatient}
            />
            <HPTextInput
              placeholder="Bekräfta lösenord *"
              value={patientConfirmPassword}
              onChangeText={setPatientConfirmPassword}
              secureTextEntry
              editable={!creatingPatient}
            />
            <View style={{flexDirection: 'row', gap: 12, marginTop: 8}}>
              <TouchableOpacity
                style={[
                  {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
                  {backgroundColor: '#007AFF'},
                ]}
                onPress={handleCreatePatient}
                disabled={creatingPatient}>
                {creatingPatient ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                    Skapa
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
                  {backgroundColor: '#9E9E9E'},
                ]}
                onPress={() => {
                  setShowCreatePatient(false);
                  setPatientName('');
                  setPatientEmail('');
                  setPatientPassword('');
                  setPatientConfirmPassword('');
                }}
                disabled={creatingPatient}>
                <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                  Avbryt
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {patients.length === 0 ? (
          <Text
            style={{
              color: '#999',
              fontSize: 14,
              fontStyle: 'italic',
              textAlign: 'center',
              padding: 20,
            }}>
            Du har inga omsorgstagare ännu.
          </Text>
        ) : (
          patients.map(p => (
            <View
              key={p.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <View>
                <Text style={{fontSize: 16, fontWeight: '600', color: '#333'}}>
                  {p.name}
                </Text>
                {p.email && (
                  <Text style={{fontSize: 14, color: '#666'}}>{p.email}</Text>
                )}
              </View>
              <TouchableOpacity
                style={{padding: 8}}
                onPress={() => handleDeletePatient(p.id, p.name)}>
                <Text
                  style={{color: '#F44336', fontSize: 14, fontWeight: '600'}}>
                  Ta bort
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const renderCaregiversContent = () => {
    if (caregiversLoading) {
      return (
        <View style={{flex: 1, justifyContent: 'center', padding: 40}}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }
    return (
      <ScrollView style={{flex: 1, padding: 20}}>
        {!showCreateCaregiver ? (
          <TouchableOpacity
            style={{
              backgroundColor: '#007AFF',
              borderRadius: 8,
              padding: 16,
              alignItems: 'center',
              marginBottom: 20,
            }}
            onPress={() => setShowCreateCaregiver(true)}>
            <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
              Lägg till
            </Text>
          </TouchableOpacity>
        ) : (
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 8,
              padding: 16,
              marginBottom: 20,
            }}>
            <HPTextInput
              placeholder="Namn *"
              value={caregiverName}
              onChangeText={setCaregiverName}
              editable={!creatingCaregiver}
            />
            <HPTextInput
              placeholder="E-post *"
              value={caregiverEmail}
              onChangeText={setCaregiverEmail}
              editable={!creatingCaregiver}
            />
            <HPTextInput
              placeholder="Lösenord (minst 8 tecken) *"
              value={caregiverPassword}
              onChangeText={setCaregiverPassword}
              secureTextEntry
              editable={!creatingCaregiver}
            />
            <View style={{flexDirection: 'row', gap: 12, marginTop: 8}}>
              <TouchableOpacity
                style={[
                  {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
                  {backgroundColor: '#007AFF'},
                ]}
                onPress={handleCreateCaregiver}
                disabled={creatingCaregiver}>
                {creatingCaregiver ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                    Skapa
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
                  {backgroundColor: '#9E9E9E'},
                ]}
                onPress={() => {
                  setShowCreateCaregiver(false);
                  setCaregiverName('');
                  setCaregiverEmail('');
                  setCaregiverPassword('');
                }}
                disabled={creatingCaregiver}>
                <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
                  Avbryt
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {caregivers.length === 0 ? (
          <Text
            style={{
              color: '#999',
              fontSize: 14,
              fontStyle: 'italic',
              textAlign: 'center',
              padding: 20,
            }}>
            Du har inga omsorgsgivare ännu.
          </Text>
        ) : (
          caregivers.map(c => (
            <View
              key={c.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
              }}>
              <Text style={{fontSize: 16, fontWeight: '600', color: '#333'}}>
                {c.name}
              </Text>
              <Text style={{fontSize: 14, color: '#666'}}>{c.email}</Text>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const renderOrganisationSettingsContent = () => (
    <View style={{flex: 1, padding: 20}}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: colors.primary.dark,
          marginBottom: 8,
        }}>
        Organisationsnamn
      </Text>
      <HPTextInput
        placeholder="Organisationsnamn"
        value={orgName}
        onChangeText={setOrgName}
        editable={!orgSaving}
      />
      <TouchableOpacity
        style={{
          backgroundColor: '#007AFF',
          borderRadius: 8,
          padding: 16,
          alignItems: 'center',
          marginTop: 20,
        }}
        onPress={handleSaveOrgName}
        disabled={orgSaving}>
        {orgSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
            Spara
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{flex: 1}}>
      <ScrollView
        horizontal
        style={{
          flexDirection: 'row',
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#e0e0e0',
        }}>
        <View style={{width: 30, backgroundColor: '#fff'}} />

        {SUB_TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[
              {
                borderRadius: 3,
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderLeftWidth: 1,
                borderLeftColor: '#e0e0e0',
                borderRightWidth: 1,
                borderRightColor: '#e0e0e0',
                paddingHorizontal: 10,
                borderBottomColor: 'transparent',
              },
              subTab === t.id && {
                borderBottomColor: colors.primary.dark,
                backgroundColor: colors.primary.background,
              },
            ]}
            onPress={() => setSubTab(t.id)}>
            <Text
              style={[
                {fontSize: 13, color: '#666', fontWeight: '500'},
                subTab === t.id && {
                  color: colors.primary.dark,
                  fontWeight: '600',
                },
              ]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{width: 30}} />
      </ScrollView>
      {subTab === 'patients' && renderPatientsContent()}
      {subTab === 'caregivers' && renderCaregiversContent()}
      {subTab === 'organisation-settings' &&
        renderOrganisationSettingsContent()}
    </View>
  );
};
