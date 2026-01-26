import React, {useState} from 'react';
import {
  View,
  Text,
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
import HPTextInput from '../components/HPTextInput';
import {Logo} from '../components/Logo/Logo';
import {colors} from '../utils/theme';

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
      style={{flex: 1, backgroundColor: colors.primary.background}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
          Healthpuck
        </Text>
        <View style={{width: '100%'}}>
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
            placeholder="Lösenord"
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
                backgroundColor: colors.primary.dark,
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
              <ActivityIndicator color={colors.semantic.white} />
            ) : (
              <Text
                style={{
                  color: colors.semantic.white,
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                Logga in
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{marginTop: 16, alignItems: 'center'}}
            onPress={() => navigation.navigate('Register')}
            disabled={loading}>
            <Text style={{color: colors.primary.dark, fontSize: 14}}>
              Har du inget konto? Registrera dig
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};
