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
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../contexts/AuthContext';
import type {AuthStackParamList} from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const {login} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Fel', 'Vänligen ange både e-post och lösenord');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error: any) {
      Alert.alert(
        'Inloggning misslyckades',
        error.message || 'Ogiltiga inloggningsuppgifter',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: '#f5f5f5'}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{flex: 1, justifyContent: 'center', padding: 20}}>
        <Text
          style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            marginBottom: 8,
          }}>
          Healthpuck
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
            placeholder="Lösenord"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
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
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
                Logga in
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{marginTop: 16, alignItems: 'center'}}
            onPress={() => navigation.navigate('Register')}
            disabled={loading}>
            <Text style={{color: '#007AFF', fontSize: 14}}>
              Har du inget konto? Registrera dig
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};
