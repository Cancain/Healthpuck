import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
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
      style={{flex: 1, backgroundColor: '#f5f5f5'}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <View style={{flex: 1, justifyContent: 'center', padding: 20}}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: '#333',
              textAlign: 'center',
              marginBottom: 8,
            }}>
            Skapa konto
          </Text>
          <Text
            style={{
              fontSize: 18,
              color: '#666',
              textAlign: 'center',
              marginBottom: 40,
            }}>
            Registrera dig för att komma igång
          </Text>

          <View style={{width: '100%'}}>
            <TextInput
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 16,
                fontSize: 16,
                color: '#333',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#ddd',
              }}
              placeholder="Namn"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!loading}
            />

            <TextInput
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 16,
                fontSize: 16,
                color: '#333',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#ddd',
              }}
              placeholder="E-post"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />

            <TextInput
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 16,
                fontSize: 16,
                color: '#333',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#ddd',
              }}
              placeholder="Lösenord (minst 8 tecken)"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
            />

            <TextInput
              style={{
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 16,
                fontSize: 16,
                color: '#333',
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#ddd',
              }}
              placeholder="Bekräfta lösenord"
              placeholderTextColor="#999"
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
                  backgroundColor: '#007AFF',
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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
                  Registrera
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{marginTop: 16, alignItems: 'center'}}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}>
              <Text style={{color: '#007AFF', fontSize: 14}}>
                Har du redan ett konto? Logga in
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
