const { existsSync } = require('node:fs');
const path = require('node:path');

module.exports = ({ config }) => {
  const projectId = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
  if (projectId && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId)) throw new Error('Invalid public Expo project identifier');
  const firebasePath = path.join(__dirname, '.native-config/google-services.json');
  return {
    ...config,
    ...(projectId ? { extra: { ...config.extra, eas: { ...config.extra?.eas, projectId } } } : {}),
    android: { ...config.android, ...(existsSync(firebasePath) ? { googleServicesFile: firebasePath } : {}) },
  };
};
