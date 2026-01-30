import React, {useEffect} from 'react';
import {getApps} from '@react-native-firebase/app';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './contexts/AuthContext';
import {PatientProvider} from './contexts/PatientContext';
import {AppNavigator} from './navigation/AppNavigator';

const App: React.FC = () => {
  useEffect(() => {
    const apps = getApps();
    if (apps.length > 0) {
      console.log('[App] Firebase initialized');
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PatientProvider>
          <AppNavigator />
        </PatientProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
