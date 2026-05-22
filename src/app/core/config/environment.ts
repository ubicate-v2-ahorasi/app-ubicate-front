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

  apiCore: 'https://ubicate.codlyp.website/api',
  wsUrl: 'https://ubicate.codlyp.website/ws-tracking',
  //apiCore: 'https://jcvjorge-transport-api-4b70ae842c45.herokuapp.com/api',
  googleMaps: {
    mapId: undefined,
    darkMapId: undefined,
  },
};
