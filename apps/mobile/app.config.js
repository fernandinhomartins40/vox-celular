const { existsSync } = require('node:fs');
const path = require('node:path');

module.exports = ({ config }) => {
  const projectId = process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
  if (projectId && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId)) throw new Error('Invalid public Expo project identifier');
  const firebasePath = path.join(__dirname, '.native-config/google-services.json');
  // Store builds number themselves from the GitHub run; the stores reject a repeated versionCode/buildNumber.
  const build = process.env.VOX_BUILD_NUMBER;
  if (build !== undefined && !/^[1-9][0-9]{0,8}$/.test(build)) throw new Error('Invalid native build number');
  const team = process.env.APPLE_TEAM_ID;
  if (team && !/^[A-Z0-9]{10}$/.test(team)) throw new Error('Invalid Apple Team ID');
  return {
    ...config,
    icon: './assets/icon.png',
    ...(projectId ? { extra: { ...config.extra, eas: { ...config.extra?.eas, projectId } } } : {}),
    android: { ...config.android, ...(build ? { versionCode: Number(build) } : {}), adaptiveIcon: { foregroundImage: './assets/icon.png', backgroundColor: '#ffffff' }, ...(existsSync(firebasePath) ? { googleServicesFile: firebasePath } : {}) },
    ios: { ...config.ios, ...(build ? { buildNumber: build } : {}), ...(team ? { appleTeamId: team } : {}) },
  };
};
