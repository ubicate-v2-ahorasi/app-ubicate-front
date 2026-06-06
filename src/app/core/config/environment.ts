interface EnvironmentConfig {
  production: boolean;
  apiCore: string;
  wsUrl: string;
  googleMaps: {
    mapId?: string;
    darkMapId?: string;
  };
}

export const environment: EnvironmentConfig = {
  production: false,
  apiCore: 'http://localhost:8080/api',
  wsUrl: 'http://localhost:8080/ws-tracking',
  googleMaps: {
    mapId: undefined,
    darkMapId: undefined,
  },
};
