export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
  password: string;
  dni: string;
  nombreEmpresa: string;
  ruc: string;
  direccion?: string;
  logo?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    nombre: string;
    role: string;
  };
}

export interface RegisterResponse {
  token: string;
  user: {
    id: number;
    email: string;
    nombre: string;
    role: string;
  };
}
