import React from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Circle, Path} from 'react-native-svg';
import {colors} from '../../utils/theme';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
}

const sizeMap = {
  small: 40,
  medium: 50,
  large: 80,
};

export const Logo: React.FC<LogoProps> = ({size = 'medium'}) => {
  const sizeValue = sizeMap[size];

  return (
    <View style={[styles.container, {width: sizeValue, height: sizeValue}]}>
      <Svg viewBox="0 0 100 100" width={sizeValue} height={sizeValue}>
        <Circle cx="50" cy="50" r="48" fill={colors.primary.background} />
        <Circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={colors.primary.dark}
          strokeWidth="6"
        />
        <Path
          d="M 50 35 C 45 30, 35 30, 35 40 C 35 50, 50 65, 50 65 C 50 65, 65 50, 65 40 C 65 30, 55 30, 50 35 Z"
          fill={colors.semantic.white}
        />
        <Path
          d="M 30 50 L 35 50 L 36 45 L 38 55 L 40 45 L 42 55 L 44 45 L 46 50 L 50 50"
          stroke={colors.primary.dark}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M 50 50 L 54 50 L 56 45 L 58 55 L 60 45 L 62 55 L 64 45 L 66 50 L 70 50"
          stroke={colors.primary.dark}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
