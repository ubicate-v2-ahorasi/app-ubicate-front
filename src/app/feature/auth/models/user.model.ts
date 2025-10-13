export interface User {
  id: number;
  email: string;
  nombre: string;
  role: string;
  empresa_id?: number; // Hacer opcional
  apellido?: string; // Hacer opcional
  dni?: string; // Hacer opcional
  telefono?: string; // Hacer opcional
  correo?: string; // Hacer opcional
  username?: string; // Hacer opcional
  created_at?: string;
  updated_at?: string;
}
