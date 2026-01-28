import React from 'react';
import {View, Text} from 'react-native';

const ICON_SIZE = 24;

export const HomeIcon: React.FC<{color: string; size?: number}> = ({
  color,
  size = ICON_SIZE,
}) => (
  <View
    style={{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
    <Text style={{fontSize: size - 2, color, lineHeight: size}}>⌂</Text>
  </View>
);

export const SettingsIcon: React.FC<{color: string; size?: number}> = ({
  color,
  size = ICON_SIZE,
}) => (
  <View
    style={{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
    <Text style={{fontSize: size - 2, color, lineHeight: size}}>⚙</Text>
  </View>
);
