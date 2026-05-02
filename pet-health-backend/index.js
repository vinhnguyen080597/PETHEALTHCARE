import dotenv from 'dotenv';
import os from 'node:os';
import { createApp } from './src/app.js';

dotenv.config();

const app = createApp();

const PORT = process.env.PORT || 3000;

function getLanUrls(port) {
  const interfaces = os.networkInterfaces();
  const urls = [];
  for (const list of Object.values(interfaces)) {
    if (!list) continue;
    for (const item of list) {
      if (item.family === 'IPv4' && !item.internal) {
        urls.push(`http://${item.address}:${port}`);
      }
    }
  }
  return urls;
}

// Bind all IPv4 interfaces so phones on the same Wi‑Fi can reach this machine (Windows-friendly).
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Also listening on LAN (use this IP from your phone): http://<YOUR_LAN_IP>:${PORT}`);
  const lanUrls = getLanUrls(PORT);
  if (lanUrls.length > 0) {
    console.log('LAN URLs for Expo devices:');
    for (const url of lanUrls) {
      console.log(`- ${url}`);
    }
  }
});