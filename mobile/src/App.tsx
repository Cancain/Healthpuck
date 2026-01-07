import React, {useEffect} from 'react';
import firebaseApp from '@react-native-firebase/app';
import {AuthProvider} from './contexts/AuthContext';
import {PatientProvider} from './contexts/PatientContext';
import {AppNavigator} from './navigation/AppNavigator';

const App: React.FC = () => {
  useEffect(() => {
    if (firebaseApp.apps.length > 0) {
      console.log('[App] Firebase initialized');
    }
  }, []);

  return (
    <AuthProvider>
      <PatientProvider>
        <AppNavigator />
      </PatientProvider>
    </AuthProvider>
  );
};

export default App;
