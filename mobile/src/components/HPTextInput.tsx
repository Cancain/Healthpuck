import React from 'react';
import {TextInput, TextInputProps} from 'react-native';

export default function HPTextInput({...props}: TextInputProps) {
  return (
    <TextInput
      style={{
        backgroundColor: '#f5f5f5',
        borderRadius: 6,
        padding: 12,
        fontSize: 14,
        color: '#333',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ddd',
      }}
      {...props}
      placeholderTextColor="#999"
    />
  );
}
