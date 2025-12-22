import React from 'react';
import {AuthProvider} from './contexts/AuthContext';
import {PatientProvider} from './contexts/PatientContext';
import {AppNavigator} from './navigation/AppNavigator';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PatientProvider>
        <AppNavigator />
      </PatientProvider>
    </AuthProvider>
  );
};

export default App;
