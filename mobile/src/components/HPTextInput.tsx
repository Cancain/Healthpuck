import React from 'react';
import {StyleProp, TextInput, TextInputProps, TextStyle} from 'react-native';
import {colors} from '../utils/theme';

export default function HPTextInput({
  style,
  ...props
}: {
  style?: StyleProp<TextStyle>;
} & TextInputProps) {
  return (
    <TextInput
      style={[
        style,
        {
          backgroundColor: colors.semantic.white,
          borderRadius: 6,
          padding: 12,
          fontSize: 14,
          color: colors.primary.dark,
          borderWidth: 1,
          borderColor: colors.primary.dark,
        },
      ]}
      {...props}
      placeholderTextColor={colors.device.iconGray}
    />
  );
}
