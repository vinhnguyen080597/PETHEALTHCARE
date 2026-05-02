import { Platform } from 'react-native';

// Must match the PC IPv4 printed by the backend: "LAN URLs for Expo devices"
const LOCAL_IP = '192.168.1.4';

export const API_BASE_URL = "https://sad-baths-leave.loca.lt"
  // Platform.OS === 'android'
  //   ? `http://${LOCAL_IP}:3000/api/v1`
  //   : `http://${LOCAL_IP}:3000/api/v1`;

export const API_HEALTH_URL = "https://sad-baths-leave.loca.lt/health"
  // Platform.OS === 'android'
  //   ? `http://${LOCAL_IP}:3000/health`
  //   : `http://${LOCAL_IP}:3000/health`;
