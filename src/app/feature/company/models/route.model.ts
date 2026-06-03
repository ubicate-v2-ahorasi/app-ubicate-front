export interface RouteFormData {
  nombre: string;
  codigo: string;
  colorHex: string;
}

export interface RouteBusBasicInfo {
  id: number;
  placa: string;
  modelo: string;
  estado: string;
}

export interface RouteStopRequest {
  nombre?: string | null;
  direccion?: string | null;
  latitud: number;
  longitud: number;
  color_hex?: string | null;
  orden?: number;
}

export interface RouteStopResponse {
  id: number;
  nombre: string | null;
  direccion: string | null;
  latitud: number;
  longitud: number;
  color_hex: string | null;
  orden: number;
  activo: boolean;
}

export interface RouteStopPassageEvent {
  id: number;
  route_stop_id: number;
  route_stop_nombre: string | null;
  route_stop_direccion: string | null;
  route_stop_color_hex: string | null;
  route_stop_orden: number;
  bus_id: number;
  placa: string;
  conductor: string | null;
  latitud: number;
  longitud: number;
  timestamp: string;
}

export interface CreateRouteRequest {
  nombre: string;
  codigo: string;
  descripcion?: string;
  origen?: string;
  destino?: string;
  color_hex?: string;
  polyline?: string;
  bus_ids?: number[];
}

export interface UpdateRouteRequest {
  nombre?: string;
  descripcion?: string;
  origen?: string;
  destino?: string;
  color_hex?: string;
  polyline?: string;
  estado?: string;
  bus_ids?: number[];
}

export interface RouteResponse {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  origen: string;
  destino: string;
  color_hex: string | null;
  polyline: string | null;
  estado: string;
  activo: boolean;
  empresa_id: number;
  fecha_creacion: string;
  fecha_actualizacion?: string | null;
  bus_ids?: number[];
  buses?: RouteBusBasicInfo[];
  total_buses?: number;
  total_paradas?: number;
}
