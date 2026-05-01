import { Platform } from 'react-native';

const LOCAL_IP = '192.168.1.5';

export const API_BASE_URL =
  Platform.OS === 'android'
    ? `http://${LOCAL_IP}:3000/api/v1`
    : `http://${LOCAL_IP}:3000/api/v1`;

export const API_HEALTH_URL =
  Platform.OS === 'android'
    ? `http://${LOCAL_IP}:3000/health`
    : `http://${LOCAL_IP}:3000/health`;
