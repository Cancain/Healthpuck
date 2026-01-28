import React, {useState, useEffect} from 'react';
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
import type {Patient, PatientUser} from '../../types/api';
import HPTextInput from '../../components/HPTextInput';

export const UsersSettings: React.FC = () => {
  const {refreshPatient, isCaretakerRole} = usePatient();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientUsers, setPatientUsers] = useState<
    Record<number, PatientUser[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState<Record<number, string>>({});
  const [inviting, setInviting] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCaretakerRole]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      if (isCaretakerRole) {
        const data = await apiService.getOrganisationPatients();
        setPatients(data);
        for (const p of data) {
          await loadPatientUsers(p.id);
        }
      } else {
        const data = await apiService.getPatients();
        setPatients(data);
        for (const p of data) {
          await loadPatientUsers(p.id);
        }
      }
    } catch (error: any) {
      if (!isCaretakerRole) {
        Alert.alert('Fel', error.message || 'Kunde inte hämta omsorgstagare');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPatientUsers = async (patientId: number) => {
    try {
      const users = await apiService.getPatientUsers(patientId);
      setPatientUsers(prev => ({...prev, [patientId]: users}));
    } catch (error) {
      console.error('Error loading patient users:', error);
    }
  };

  const handleCreatePatient = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Fel', 'Vänligen fyll i alla fält');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Fel', 'Lösenordet måste vara minst 8 tecken');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Fel', 'Lösenorden matchar inte');
      return;
    }

    setCreating(true);
    try {
      await apiService.createPatient(name.trim(), email.trim(), password);
      Alert.alert('Lyckades', 'Omsorgstagare skapad');
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowCreate(false);
      await loadPatients();
      await refreshPatient();
    } catch (error: any) {
      Alert.alert('Fel', error.message || 'Kunde inte skapa omsorgstagare');
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (patientId: number) => {
    const inviteEmailValue = inviteEmail[patientId]?.trim();
    if (!inviteEmailValue) {
      Alert.alert('Fel', 'E-post krävs');
      return;
    }

    setInviting(prev => ({...prev, [patientId]: true}));
    try {
      await apiService.inviteUser(patientId, inviteEmailValue, 'caregiver');
      Alert.alert('Lyckades', 'Användare inbjuden');
      setInviteEmail(prev => ({...prev, [patientId]: ''}));
      await loadPatientUsers(patientId);
    } catch (error: any) {
      Alert.alert('Fel', error.message || 'Kunde inte bjuda in användare');
    } finally {
      setInviting(prev => ({...prev, [patientId]: false}));
    }
  };

  const handleDeletePatient = async (
    patientId: number,
    patientName: string,
  ) => {
    Alert.alert(
      'Ta bort omsorgstagare',
      `Är du säker på att du vill ta bort ${patientName}? Detta kommer att ta bort alla data kopplade till denna omsorgstagare.`,
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

  if (loading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={{flex: 1, padding: 20}}>
      {!showCreate ? (
        <TouchableOpacity
          style={{
            backgroundColor: '#007AFF',
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            marginBottom: 20,
          }}
          onPress={() => setShowCreate(true)}>
          <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
            Lägg till omsorgstagare
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
            value={name}
            onChangeText={setName}
            editable={!creating}
          />
          <HPTextInput
            placeholder="E-post *"
            value={email}
            onChangeText={setEmail}
            editable={!creating}
          />
          <HPTextInput
            placeholder="Lösenord (minst 8 tecken) *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!creating}
          />
          <HPTextInput
            placeholder="Bekräfta lösenord *"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!creating}
          />
          <View style={{flexDirection: 'row', gap: 12, marginTop: 8}}>
            <TouchableOpacity
              style={[
                {flex: 1, borderRadius: 6, padding: 12, alignItems: 'center'},
                {backgroundColor: '#007AFF'},
              ]}
              onPress={handleCreatePatient}
              disabled={creating}>
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
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
                setShowCreate(false);
                setName('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
              disabled={creating}>
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
        patients.map(p => {
          const users = patientUsers[p.id] || [];
          return (
            <View
              key={p.id}
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 16,
                }}>
                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#333',
                      marginBottom: 4,
                    }}>
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

              <View
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: '#e0e0e0',
                }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: 12,
                  }}>
                  Användare
                </Text>
                {users.length === 0 ? (
                  <Text
                    style={{
                      color: '#999',
                      fontSize: 14,
                      fontStyle: 'italic',
                      textAlign: 'center',
                      padding: 20,
                    }}>
                    Inga användare ännu
                  </Text>
                ) : (
                  users.map(user => (
                    <View
                      key={user.userId}
                      style={{
                        padding: 12,
                        backgroundColor: '#f5f5f5',
                        borderRadius: 6,
                        marginBottom: 8,
                      }}>
                      <View>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: '#333',
                          }}>
                          {user.name}
                        </Text>
                        <Text
                          style={{fontSize: 12, color: '#666', marginTop: 2}}>
                          {user.email}
                        </Text>
                        <Text
                          style={{fontSize: 12, color: '#666', marginTop: 2}}>
                          {user.role === 'patient'
                            ? 'Omsorgstagare'
                            : 'Omsorgsgivare'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: '#e0e0e0',
                }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: 12,
                  }}>
                  Bjud in omsorgsgivare
                </Text>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <HPTextInput
                    placeholder="E-postadress"
                    value={inviteEmail[p.id] || ''}
                    onChangeText={text =>
                      setInviteEmail(prev => ({...prev, [p.id]: text}))
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!inviting[p.id]}
                  />
                  <TouchableOpacity
                    style={[
                      {
                        flex: 1,
                        borderRadius: 6,
                        padding: 12,
                        alignItems: 'center',
                      },
                      {backgroundColor: '#007AFF'},
                      {flex: 0, paddingHorizontal: 16},
                    ]}
                    onPress={() => handleInvite(p.id)}
                    disabled={inviting[p.id]}>
                    {inviting[p.id] ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: '600',
                        }}>
                        Bjud in
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};
