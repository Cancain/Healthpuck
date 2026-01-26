import React, {useEffect, useRef} from 'react';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useAuth} from '../contexts/AuthContext';
import {usePatient} from '../contexts/PatientContext';
import {LoginScreen} from '../screens/Login';
import {RegisterScreen} from '../screens/Register';
import {DashboardScreen} from '../screens/Dashboard';
import {SettingsScreen} from '../screens/Settings';
import {notificationService} from '../services/notifications';
import {bluetoothMonitoringService} from '../services/bluetoothMonitoring';
import {colors} from '../utils/theme';
import type {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{headerShown: false}}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

const MainNavigator = () => {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: {fontSize: 12},
        tabBarActiveTintColor: colors.primary.dark,
        tabBarInactiveTintColor: colors.device.iconGray,
      }}>
      <MainTab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{tabBarLabel: 'Dashboard'}}
      />
      <MainTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{tabBarLabel: 'Inställningar'}}
      />
    </MainTab.Navigator>
  );
};

export const AppNavigator = () => {
  const {isAuthenticated, isLoading: authLoading} = useAuth();
  const {isPatientRole, isLoading: patientLoading} = usePatient();
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    if (isAuthenticated) {
      notificationService.registerToken();
      notificationService.setupNotificationHandlers();
    } else {
      notificationService.unregisterToken();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (navigationRef.current) {
      notificationService.setNavigationRef(navigationRef.current);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading || patientLoading) {
      console.log(
        '[AppNavigator] Still loading (auth:',
        authLoading,
        ', patient:',
        patientLoading,
        '), waiting...',
      );
      return;
    }

    if (isAuthenticated && isPatientRole) {
      console.log(
        '[AppNavigator] User authenticated as patient, starting Bluetooth monitoring',
      );
      bluetoothMonitoringService.startMonitoring().catch(error => {
        console.error(
          '[AppNavigator] Failed to start Bluetooth monitoring:',
          error,
        );
      });
    } else {
      console.log(
        '[AppNavigator] Stopping Bluetooth monitoring (authenticated:',
        isAuthenticated,
        ', isPatientRole:',
        isPatientRole,
        ')',
      );
      bluetoothMonitoringService.stopMonitoring().catch(() => {});
    }

    return () => {
      if (!isAuthenticated || !isPatientRole) {
        bluetoothMonitoringService.stopMonitoring().catch(() => {});
      }
    };
  }, [isAuthenticated, isPatientRole, authLoading, patientLoading]);

  if (authLoading) {
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{headerShown: false}}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
