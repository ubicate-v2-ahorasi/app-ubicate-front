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
  production: true,
  apiCore: 'https://ubicate.codlyp.website/api',
  wsUrl: 'https://ubicate.codlyp.website/ws-tracking',
  googleMaps: {
    mapId: undefined,
    darkMapId: undefined,
  },
};
