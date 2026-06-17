#!/usr/bin/env node

const checklist = [
  'Install the latest EAS production build on a real iPhone and Android device.',
  'Launch the app without Expo Go, ngrok, or local backend dependencies.',
  'Sign up, log out, and log back in against the production API.',
  'Open Terms, Privacy Policy, and Support from the login screen and Account screen.',
  'Create a pet, upload an avatar, and run one wellness check end-to-end.',
  'Open Pet Feed, breeder detail, and account deletion confirmation.',
  'After 15+ minutes idle, reopen the app and confirm login/API still works.',
];

console.log('Native production smoke checklist');
console.log('=================================');
for (const [index, item] of checklist.entries()) {
  console.log(`${index + 1}. ${item}`);
}
console.log('\nBuild commands:');
console.log('  yarn build:ios:production');
console.log('  yarn build:android:production');
console.log('\nAfter installing the build, follow pet-health-context/APP-STORE-QA-RUNSHEET.md.');
