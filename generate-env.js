const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, './src/app/core/config/environment.ts');

const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.npm_lifecycle_event === 'build:prod';

const DEFAULT_API = isProduction ? 'https://ubicate.codlyp.website/api' : 'http://localhost:8080/api';
const DEFAULT_WS = isProduction ? 'https://ubicate.codlyp.website/ws-tracking' : 'http://localhost:8080/ws-tracking';

const apiCore = process.env.API_CORE || DEFAULT_API;
const wsUrl = process.env.WS_URL || DEFAULT_WS;
const mapId = process.env.GOOGLE_MAP_ID || '';
const darkMapId = process.env.GOOGLE_DARK_MAP_ID || '';

const envConfigFile = `interface EnvironmentConfig {
  production: boolean;
  apiCore: string;
  wsUrl: string;
  googleMaps: {
    mapId?: string;
    darkMapId?: string;
  };
}

export const environment: EnvironmentConfig = {
  production: ${isProduction},
  apiCore: '${apiCore}',
  wsUrl: '${wsUrl}',
  googleMaps: {
    mapId: ${mapId ? "'" + mapId + "'" : 'undefined'},
    darkMapId: ${darkMapId ? "'" + darkMapId + "'" : 'undefined'},
  },
};
`;

console.log('---------------------------------------------------------');
console.log('NG ENVIRONMENT GENERATOR');
console.log('---------------------------------------------------------');
console.log('API_CORE detected: ' + apiCore);
console.log('WS_URL detected: ' + wsUrl);
console.log('GOOGLE_MAP_ID detected: ' + (mapId || 'undefined'));
console.log('GOOGLE_DARK_MAP_ID detected: ' + (darkMapId || 'undefined'));
console.log('NODE_ENV: ' + (process.env.NODE_ENV || 'development'));
console.log('Writing to: ' + targetPath);
console.log('---------------------------------------------------------');

try {
  fs.writeFileSync(targetPath, envConfigFile);
  console.log('Environment file generated successfully!');
} catch (err) {
  console.error('Error generating environment file:', err);
  process.exit(1);
}
