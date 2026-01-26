import React from 'react';
import {TextInput, TextInputProps} from 'react-native';
import {colors} from '../utils/theme';

export default function HPTextInput({...props}: TextInputProps) {
  return (
    <TextInput
      style={{
        backgroundColor: colors.semantic.white,
        borderRadius: 6,
        padding: 12,
        fontSize: 14,
        color: colors.primary.dark,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.primary.dark,
      }}
      {...props}
      placeholderTextColor={colors.device.iconGray}
    />
  );
}
