interface EnvironmentConfig {
  production: boolean;
  apiCore: string;
  googleMaps: {
    mapId?: string;
    darkMapId?: string;
  };
}

export const environment: EnvironmentConfig = {
  production: false,

  apiCore: 'https://jcvjorge-transport-api-4b70ae842c45.herokuapp.com/api',
  //apiCore: 'http://localhost:8080/api',
  googleMaps: {
    mapId: undefined,
    darkMapId: undefined,
  },
};
