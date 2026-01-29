import React from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome';
import type {IconProp} from '@fortawesome/fontawesome-svg-core';
import {faHouse, faGear} from '@fortawesome/free-solid-svg-icons';

const ICON_SIZE = 24;

export const HomeIcon: React.FC<{color: string; size?: number}> = ({
  color,
  size = ICON_SIZE,
}) => <FontAwesomeIcon icon={faHouse as IconProp} size={size} color={color} />;

export const SettingsIcon: React.FC<{color: string; size?: number}> = ({
  color,
  size = ICON_SIZE,
}) => <FontAwesomeIcon icon={faGear as IconProp} size={size} color={color} />;
