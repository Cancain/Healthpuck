import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useAuth} from '../contexts/AuthContext';
import {usePatient} from '../contexts/PatientContext';
import {apiService} from '../services/api';
import HPTextInput from '../components/HPTextInput';
import {Logo} from '../components/Logo/Logo';
import {colors} from '../utils/theme';

interface InviteForm {
  name: string;
  email: string;
  password: string;
}

export const OnboardingScreen: React.FC = () => {
  const {user} = useAuth();
  const {refreshPatient} = usePatient();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [organisationName, setOrganisationName] = useState(
    user ? `${user.name}'s Organisation` : '',
  );
  const [patientInvites, setPatientInvites] = useState<InviteForm[]>([
    {name: '', email: '', password: ''},
  ]);
  const [caregiverInvites, setCaregiverInvites] = useState<InviteForm[]>([
    {name: '', email: '', password: ''},
  ]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateOrganisationName = (): boolean => {
    const trimmed = organisationName.trim();
    if (!trimmed) {
      Alert.alert('Fel', 'Organisationsnamn krävs');
      return false;
    }
    if (trimmed.length > 100) {
      Alert.alert(
        'Fel',
        'Organisationsnamn får inte vara längre än 100 tecken',
      );
      return false;
    }
    return true;
  };

  const validateInvites = (invites: InviteForm[]): boolean => {
    const newErrors: Record<string, string> = {};
    const emailSet = new Set<string>();

    invites.forEach((invite, index) => {
      if (!invite.name.trim()) {
        newErrors[`${index}-name`] = 'Namn krävs';
      }
      if (!invite.email.trim()) {
        newErrors[`${index}-email`] = 'E-post krävs';
      } else if (!emailRegex.test(invite.email)) {
        newErrors[`${index}-email`] = 'Ogiltig e-postadress';
      } else if (emailSet.has(invite.email.toLowerCase())) {
        newErrors[`${index}-email`] = 'Duplicerad e-postadress';
      } else {
        emailSet.add(invite.email.toLowerCase());
      }
      if (!invite.password) {
        newErrors[`${index}-password`] = 'Lösenord krävs';
      } else if (invite.password.length < 8) {
        newErrors[`${index}-password`] = 'Lösenord måste vara minst 8 tecken';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      Alert.alert('Valideringsfel', firstError);
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleStep1 = async () => {
    if (!validateOrganisationName()) {
      return;
    }

    setLoading(true);
    try {
      await apiService.createOrganisation(organisationName.trim());
      setCurrentStep(2);
    } catch (err) {
      Alert.alert(
        'Fel',
        err instanceof Error ? err.message : 'Kunde inte skapa organisation',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    const validInvites = patientInvites.filter(
      inv => inv.name.trim() && inv.email.trim() && inv.password,
    );

    if (validInvites.length > 0 && !validateInvites(validInvites)) {
      return;
    }

    if (validInvites.length > 0) {
      setLoading(true);
      try {
        const invites = validInvites.map(inv => ({
          email: inv.email.trim(),
          name: inv.name.trim(),
          password: inv.password,
          role: 'patient' as const,
        }));

        const result = await apiService.inviteUsersToOrganisation(invites);

        if (result.errors.length > 0) {
          const errorMessages = result.errors
            .map(e => `${e.email}: ${e.error}`)
            .join('\n');
          Alert.alert(
            'Varning',
            `Några patienter kunde inte skapas:\n${errorMessages}`,
          );
        }

        if (result.created.length > 0 || validInvites.length === 0) {
          setCurrentStep(3);
        }
      } catch (err) {
        Alert.alert(
          'Fel',
          err instanceof Error ? err.message : 'Kunde inte skapa patienter',
        );
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentStep(3);
    }
  };

  const handleStep3 = async () => {
    const validInvites = caregiverInvites.filter(
      inv => inv.name.trim() && inv.email.trim() && inv.password,
    );

    if (validInvites.length > 0 && !validateInvites(validInvites)) {
      return;
    }

    if (validInvites.length > 0) {
      setLoading(true);
      try {
        const invites = validInvites.map(inv => ({
          email: inv.email.trim(),
          name: inv.name.trim(),
          password: inv.password,
          role: 'caregiver' as const,
        }));

        const result = await apiService.inviteUsersToOrganisation(invites);

        if (result.errors.length > 0) {
          const errorMessages = result.errors
            .map(e => `${e.email}: ${e.error}`)
            .join('\n');
          Alert.alert(
            'Varning',
            `Några omsorgsgivare kunde inte skapas:\n${errorMessages}`,
          );
        }
      } catch (err) {
        Alert.alert(
          'Fel',
          err instanceof Error ? err.message : 'Kunde inte skapa omsorgsgivare',
        );
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    await refreshPatient();
  };

  const addPatientInvite = () => {
    setPatientInvites([...patientInvites, {name: '', email: '', password: ''}]);
  };

  const removePatientInvite = (index: number) => {
    if (patientInvites.length > 1) {
      setPatientInvites(patientInvites.filter((_, i) => i !== index));
    }
  };

  const updatePatientInvite = (
    index: number,
    field: keyof InviteForm,
    value: string,
  ) => {
    const updated = [...patientInvites];
    updated[index] = {...updated[index], [field]: value};
    setPatientInvites(updated);
  };

  const addCaregiverInvite = () => {
    setCaregiverInvites([
      ...caregiverInvites,
      {name: '', email: '', password: ''},
    ]);
  };

  const removeCaregiverInvite = (index: number) => {
    if (caregiverInvites.length > 1) {
      setCaregiverInvites(caregiverInvites.filter((_, i) => i !== index));
    }
  };

  const updateCaregiverInvite = (
    index: number,
    field: keyof InviteForm,
    value: string,
  ) => {
    const updated = [...caregiverInvites];
    updated[index] = {...updated[index], [field]: value};
    setCaregiverInvites(updated);
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: colors.primary.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{flexGrow: 1, padding: 20}}>
        <View style={{alignItems: 'center', marginBottom: 20}}>
          <Logo size="large" />
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
            gap: 8,
          }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor:
                currentStep >= 1 ? colors.primary.dark : colors.device.iconGray,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text
              style={{
                color: colors.semantic.white,
                fontWeight: '600',
                fontSize: 14,
              }}>
              1
            </Text>
          </View>
          <Text style={{color: colors.device.iconGray, fontSize: 16}}>→</Text>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor:
                currentStep >= 2 ? colors.primary.dark : colors.device.iconGray,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text
              style={{
                color: colors.semantic.white,
                fontWeight: '600',
                fontSize: 14,
              }}>
              2
            </Text>
          </View>
          <Text style={{color: colors.device.iconGray, fontSize: 16}}>→</Text>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor:
                currentStep >= 3 ? colors.primary.dark : colors.device.iconGray,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text
              style={{
                color: colors.semantic.white,
                fontWeight: '600',
                fontSize: 14,
              }}>
              3
            </Text>
          </View>
        </View>

        {currentStep === 1 && (
          <View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '600',
                color: colors.primary.dark,
                marginBottom: 8,
                textAlign: 'center',
              }}>
              Skapa din organisation
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.device.iconGray,
                marginBottom: 24,
                textAlign: 'center',
              }}>
              Ge din organisation ett namn. Du kan ändra detta senare.
            </Text>

            <HPTextInput
              placeholder="Organisationsnamn"
              value={organisationName}
              onChangeText={setOrganisationName}
              editable={!loading}
              maxLength={100}
            />

            <TouchableOpacity
              style={{
                backgroundColor: colors.primary.dark,
                borderRadius: 8,
                padding: 16,
                alignItems: 'center',
                marginTop: 8,
              }}
              onPress={handleStep1}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.semantic.white} />
              ) : (
                <Text
                  style={{
                    color: colors.semantic.white,
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                  Fortsätt
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {currentStep === 2 && (
          <View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '600',
                color: colors.primary.dark,
                marginBottom: 8,
                textAlign: 'center',
              }}>
              Lägg till patienter
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.device.iconGray,
                marginBottom: 24,
                textAlign: 'center',
              }}>
              Skapa konton för patienter i din organisation. Du kan hoppa över
              detta steg.
            </Text>

            {patientInvites.map((invite, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: colors.semantic.white,
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.primary.dark,
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.primary.dark,
                    }}>
                    Patient {index + 1}
                  </Text>
                  {patientInvites.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removePatientInvite(index)}
                      disabled={loading}>
                      <Text
                        style={{
                          color: '#dc2626',
                          fontSize: 14,
                          fontWeight: '500',
                        }}>
                        Ta bort
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <HPTextInput
                  placeholder="Namn"
                  value={invite.name}
                  onChangeText={value =>
                    updatePatientInvite(index, 'name', value)
                  }
                  editable={!loading}
                />
                {errors[`${index}-name`] && (
                  <Text
                    style={{
                      color: '#dc2626',
                      fontSize: 12,
                      marginTop: -8,
                      marginBottom: 8,
                    }}>
                    {errors[`${index}-name`]}
                  </Text>
                )}

                <HPTextInput
                  placeholder="E-post"
                  value={invite.email}
                  onChangeText={value =>
                    updatePatientInvite(index, 'email', value)
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
                {errors[`${index}-email`] && (
                  <Text
                    style={{
                      color: '#dc2626',
                      fontSize: 12,
                      marginTop: -8,
                      marginBottom: 8,
                    }}>
                    {errors[`${index}-email`]}
                  </Text>
                )}

                <HPTextInput
                  placeholder="Lösenord (minst 8 tecken)"
                  value={invite.password}
                  onChangeText={value =>
                    updatePatientInvite(index, 'password', value)
                  }
                  secureTextEntry
                  editable={!loading}
                />
                {errors[`${index}-password`] && (
                  <Text
                    style={{
                      color: '#dc2626',
                      fontSize: 12,
                      marginTop: -8,
                      marginBottom: 8,
                    }}>
                    {errors[`${index}-password`]}
                  </Text>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={{
                backgroundColor: colors.semantic.white,
                borderWidth: 1,
                borderColor: colors.primary.dark,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
                marginBottom: 16,
              }}
              onPress={addPatientInvite}
              disabled={loading}>
              <Text
                style={{
                  color: colors.primary.dark,
                  fontSize: 14,
                  fontWeight: '500',
                }}>
                Lägg till patient
              </Text>
            </TouchableOpacity>

            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.semantic.white,
                  borderWidth: 1,
                  borderColor: colors.primary.dark,
                  borderRadius: 8,
                  padding: 16,
                  alignItems: 'center',
                }}
                onPress={() => setCurrentStep(3)}
                disabled={loading}>
                <Text
                  style={{
                    color: colors.primary.dark,
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                  Hoppa över
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.primary.dark,
                  borderRadius: 8,
                  padding: 16,
                  alignItems: 'center',
                }}
                onPress={handleStep2}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.semantic.white} />
                ) : (
                  <Text
                    style={{
                      color: colors.semantic.white,
                      fontSize: 16,
                      fontWeight: '600',
                    }}>
                    Fortsätt
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentStep === 3 && (
          <View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '600',
                color: colors.primary.dark,
                marginBottom: 8,
                textAlign: 'center',
              }}>
              Lägg till omsorgsgivare
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.device.iconGray,
                marginBottom: 24,
                textAlign: 'center',
              }}>
              Skapa konton för andra omsorgsgivare i din organisation. Du kan
              hoppa över detta steg.
            </Text>

            {caregiverInvites.map((invite, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: colors.semantic.white,
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.primary.dark,
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.primary.dark,
                    }}>
                    Omsorgsgivare {index + 1}
                  </Text>
                  {caregiverInvites.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeCaregiverInvite(index)}
                      disabled={loading}>
                      <Text
                        style={{
                          color: '#dc2626',
                          fontSize: 14,
                          fontWeight: '500',
                        }}>
                        Ta bort
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <HPTextInput
                  placeholder="Namn"
                  value={invite.name}
                  onChangeText={value =>
                    updateCaregiverInvite(index, 'name', value)
                  }
                  editable={!loading}
                />
                {errors[`${index}-name`] && (
                  <Text
                    style={{
                      color: '#dc2626',
                      fontSize: 12,
                      marginTop: -8,
                      marginBottom: 8,
                    }}>
                    {errors[`${index}-name`]}
                  </Text>
                )}

                <HPTextInput
                  placeholder="E-post"
                  value={invite.email}
                  onChangeText={value =>
                    updateCaregiverInvite(index, 'email', value)
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
                {errors[`${index}-email`] && (
                  <Text
                    style={{
                      color: '#dc2626',
                      fontSize: 12,
                      marginTop: -8,
                      marginBottom: 8,
                    }}>
                    {errors[`${index}-email`]}
                  </Text>
                )}

                <HPTextInput
                  placeholder="Lösenord (minst 8 tecken)"
                  value={invite.password}
                  onChangeText={value =>
                    updateCaregiverInvite(index, 'password', value)
                  }
                  secureTextEntry
                  editable={!loading}
                />
                {errors[`${index}-password`] && (
                  <Text
                    style={{
                      color: '#dc2626',
                      fontSize: 12,
                      marginTop: -8,
                      marginBottom: 8,
                    }}>
                    {errors[`${index}-password`]}
                  </Text>
                )}
              </View>
            ))}

            <TouchableOpacity
              style={{
                backgroundColor: colors.semantic.white,
                borderWidth: 1,
                borderColor: colors.primary.dark,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
                marginBottom: 16,
              }}
              onPress={addCaregiverInvite}
              disabled={loading}>
              <Text
                style={{
                  color: colors.primary.dark,
                  fontSize: 14,
                  fontWeight: '500',
                }}>
                Lägg till omsorgsgivare
              </Text>
            </TouchableOpacity>

            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.semantic.white,
                  borderWidth: 1,
                  borderColor: colors.primary.dark,
                  borderRadius: 8,
                  padding: 16,
                  alignItems: 'center',
                }}
                onPress={handleStep3}
                disabled={loading}>
                <Text
                  style={{
                    color: colors.primary.dark,
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                  Hoppa över
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.primary.dark,
                  borderRadius: 8,
                  padding: 16,
                  alignItems: 'center',
                }}
                onPress={handleStep3}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={colors.semantic.white} />
                ) : (
                  <Text
                    style={{
                      color: colors.semantic.white,
                      fontSize: 16,
                      fontWeight: '600',
                    }}>
                    Slutför
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
