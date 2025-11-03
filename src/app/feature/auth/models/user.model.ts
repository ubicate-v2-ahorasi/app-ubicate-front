export interface User {
  id: number;
  empresa_id: number;
  email: string;
  nombre: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  correo?: string;
  username?: string;
  role: string;
}
