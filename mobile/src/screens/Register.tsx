import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../contexts/AuthContext';
import type {AuthStackParamList} from '../navigation/types';
import HPTextInput from '../components/HPTextInput';
import {Logo} from '../components/Logo/Logo';
import {colors} from '../utils/theme';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {register} = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
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

    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
    } catch (error: any) {
      Alert.alert(
        'Registrering misslyckades',
        error.message || 'Kunde inte skapa konto',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: colors.primary.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <View style={{flex: 1, justifyContent: 'center', padding: 20}}>
          <View style={{alignItems: 'center', marginBottom: 16}}>
            <Logo size="large" />
          </View>
          <Text
            style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: colors.primary.dark,
              textAlign: 'center',
              marginBottom: 8,
            }}>
            Skapa konto
          </Text>
          <Text
            style={{
              fontSize: 18,
              color: colors.primary.dark,
              textAlign: 'center',
              marginBottom: 40,
            }}>
            Registrera dig för att komma igång
          </Text>

          <View style={{width: '100%'}}>
            <HPTextInput
              placeholder="Namn"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />

            <HPTextInput
              placeholder="E-post"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />

            <HPTextInput
              placeholder="Lösenord (minst 8 tecken)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
            />

            <HPTextInput
              placeholder="Bekräfta lösenord"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
            />

            <TouchableOpacity
              style={[
                {
                  backgroundColor: colors.primary.dark,
                  borderRadius: 8,
                  padding: 16,
                  alignItems: 'center',
                  marginTop: 8,
                },
                loading && {opacity: 0.6},
              ]}
              onPress={handleRegister}
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
                  Registrera
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{marginTop: 16, alignItems: 'center'}}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}>
              <Text style={{color: colors.primary.dark, fontSize: 14}}>
                Har du redan ett konto? Logga in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
