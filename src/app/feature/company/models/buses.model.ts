export interface BusesStats {
  total_buses: number;
  buses_activos: number;
  buses_inactivos: number;
  buses_en_ruta: number;
  buses_en_mantenimiento: number;
  estado_por_cantidad: Record<string, number>;
}

export interface Bus {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  capacidad: number;
  anio: number;
  estado: string;
  activo: boolean;
  empresa_id: number;
  fecha_creacion: string;
  fecha_actualizacion: string;
  conductor?: {
    id: number;
    nombre_completo?: string;
    nombreCompleto?: string;
    email?: string;
    dni?: string;
    telefono?: string;
    numero_licencia?: string;
    numeroLicencia?: string;
    categoria_licencia?: string;
    categoriaLicencia?: string;
    estado?: string;
  } | null;
  ruta?: {
    id: number;
    nombre: string;
    codigo: string;
    color_hex: string;
    origen: string;
    destino: string;
  };
}

export interface Ruta {
  id: number;
  nombre: string;
  descripcion: string;
  codigo: string;
  origen: string;
  destino: string;
  estado: 'ACTIVA' | 'INACTIVA';
  activo: boolean;
  empresa_id: number;
  total_buses: number;
}
