import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { HttpClientService } from '../../../../core/service/http-client.service';

export interface ApiResponse {
  message: string;
  success: boolean;
}

export type Estado = 'ACTIVO' | 'INACTIVO' | 'VACACIONES' | 'SUSPENDIDO';

export interface ConductorResponse {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string | null;
  dni: string;
  numeroLicencia: string;
  categoriaLicencia: string;
  fechaVencimientoLicencia: string;
  estado: Estado;
  busAsignadoId: number | null;
  empresaId: number;
  fechaIngreso: string;
  activo: boolean;
}

export interface ConductorCreatedResponse {
  conductor: ConductorResponse;
  username: string;
  temp_password: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class ConductorService {
  private httpClient = inject(HttpClientService);
  private readonly base = 'conductores';

  // Crear conductor
  createConductor(body: any): Observable<ConductorCreatedResponse> {
    return this.httpClient.post<ConductorCreatedResponse>(this.base, body);
  }

  // Obtener estadísticas de conductores
  getConductorStats(): Observable<any> {
    return this.httpClient.get<any>(`${this.base}/stats`);
  }

  getConductores(
  page = 0,
  size = 20,
  sort = 'fechaIngreso,desc',
  search?: string,
  estado?: Estado,
  categoria?: string // Agregar este parámetro
): Observable<Page<ConductorResponse>> {
  let params = new HttpParams()
    .set('page', String(page))
    .set('size', String(size))
    .set('sort', sort);

  if (search && search.trim().length > 0) {
    params = params.set('search', search.trim());
  }

  if (estado) {
    params = params.set('estado', estado);
  }

  if (categoria && categoria !== 'Todas') {
    params = params.set('categoria', categoria); // Agregar el parámetro de categoría
  }

  return this.httpClient.get<Page<ConductorResponse>>(this.base, params );
}

  // Buscar conductores con un término de búsqueda
  searchConductores(
    q: string,
    page = 0,
    size = 20
  ): Observable<Page<ConductorResponse>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    if (q && q.trim().length > 0) params = params.set('q', q.trim());
    return this.httpClient.get<Page<ConductorResponse>>(
      `${this.base}/search`,
      params
    );
  }

  // Obtener conductor por ID
  getConductorById(conductorId: number): Observable<ConductorResponse> {
    return this.httpClient.get<ConductorResponse>(
      `${this.base}/${conductorId}`
    );
  }

  // Actualizar conductor
  updateConductor(
    conductorId: number,
    body: any
  ): Observable<ConductorResponse> {
    return this.httpClient.put<ConductorResponse>(
      `${this.base}/${conductorId}`,
      body
    );
  }

  // Actualizar estado del conductor
  updateConductorStatus(
    conductorId: number,
    estado: Estado
  ): Observable<ConductorResponse> {
    const params = new HttpParams().set('estado', estado);
    return this.httpClient.patch<ConductorResponse>(
      `${this.base}/${conductorId}/estado`,
      null,
      params
    );
  }

  // Asignar un bus al conductor
  asignarBus(
    conductorId: number,
    busId: number
  ): Observable<ConductorResponse> {
    const params = new HttpParams().set('busId', String(busId));
    return this.httpClient.patch<ConductorResponse>(
      `${this.base}/${conductorId}/asignar-bus`,
      null,
      params
    );
  }

  // Remover el bus asignado al conductor
  removerBus(conductorId: number): Observable<ConductorResponse> {
    return this.httpClient.patch<ConductorResponse>(
      `${this.base}/${conductorId}/remover-bus`,
      null
    );
  }

  // Obtener conductores por estado
  getConductoresByEstado(estado: Estado): Observable<ConductorResponse[]> {
    return this.httpClient.get<ConductorResponse[]>(
      `${this.base}/estado/${estado}`
    );
  }

  // Eliminar conductor
  deleteConductor(conductorId: number): Observable<ApiResponse> {
    return this.httpClient.delete<ApiResponse>(`${this.base}/${conductorId}`);
  }
}
