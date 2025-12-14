import { Injectable } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  get,
  onValue,
  off,
  update,
} from '@angular/fire/database';
import { Observable } from 'rxjs';

export interface BusFirebase {
  id: string;
  placa: string;
  modelo: string;
  estado: string;
  activo: boolean;
  latitud: number;
  longitud: number;
  velocidad?: number;
  ruta?: { id: number; nombre: string; codigo: string; color_hex: string };
  rutaId?: number | string;
}

export interface BusWithPosition extends BusFirebase {
  position: { lat: number; lng: number };
}

export interface CommentFirebase {
  id: string;
  comment: string;
  stars: number;
  date_time_str: string;
  timestamp: number;
  status?: 'pendiente' | 'revisado' | 'resuelto';
  category?: 'servicio' | 'conductor' | 'vehiculo' | 'puntualidad' | 'otro';
  userRole?: string;
}

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  constructor(private db: Database) {}

  // Método para agregar datos de prueba a la base de datos.
  async addTestData(data: any): Promise<string | null> {
    const listRef = ref(this.db, 'testCollection');
    const newItemRef = push(listRef);
    await set(newItemRef, { ...data, createdAt: new Date().toISOString() });
    return newItemRef.key;
  }

  /**
   * Método para obtener los comentarios de un bus específico en tiempo real.
   * Incluye el campo 'status' para gestionar el estado de cada comentario.
   * @param empresaId ID de la empresa
   * @param busId ID del bus
   * @returns Observable con array de comentarios
   */
  streamBusComments(
    empresaId: number,
    busId: number
  ): Observable<CommentFirebase[]> {
    return new Observable<CommentFirebase[]>((subscriber) => {
      const path = `empresas/${empresaId}/buses/${busId}/calificaciones`;
      const commentsRef = ref(this.db, path);

      console.log(`[FirebaseService] Consultando comentarios en: ${path}`);

      const handler = (snapshot: any) => {
        if (!snapshot.exists()) {
          console.log(`[FirebaseService] No hay comentarios en: ${path}`);
          subscriber.next([]);
          return;
        }

        const rawComments = snapshot.val();
        const commentsArray: CommentFirebase[] = Object.entries(
          rawComments
        ).map(([key, value]: [string, any]) => ({
          id: key,
          comment: value.comment ?? '',
          stars: value.stars ?? 0,
          date_time_str: value.date_time_str ?? '',
          timestamp: value.timestamp ?? Date.now(),
          status: value.status ?? 'pendiente', // Estado por defecto
          category: value.category ?? 'otro',
          userRole: value.userRole ?? 'Usuario desconocido',
        }));

        console.log(
          `[FirebaseService] ${commentsArray.length} comentarios obtenidos para el bus ${busId}`
        );
        subscriber.next(commentsArray);
      };

      const errorHandler = (error: any) => {
        console.error(
          `[FirebaseService] Error en streamBusComments para bus ${busId}:`,
          error
        );
        subscriber.error(error);
      };

      onValue(commentsRef, handler, errorHandler);

      // Cleanup function
      return () => {
        console.log(
          `[FirebaseService] Desuscribiendo de comentarios del bus ${busId}`
        );
        off(commentsRef, 'value', handler);
      };
    });
  }

  /**
   * Método para obtener todos los buses de una empresa en tiempo real.
   * @param empresaId ID de la empresa
   * @returns Observable con array de buses
   */
  streamBusesByEmpresa(empresaId: number): Observable<BusFirebase[]> {
    return new Observable((subscriber) => {
      const path = `empresas/${empresaId}/buses`;
      const busesRef = ref(this.db, path);

      console.log(`[FirebaseService] Consultando buses en: ${path}`);

      const handler = (snapshot: any) => {
        if (!snapshot.exists()) {
          console.log(`[FirebaseService] No hay buses en: ${path}`);
          subscriber.next([]);
          return;
        }

        const rawBuses = snapshot.val();
        const busesArray: BusFirebase[] = Object.entries(rawBuses).map(
          ([id, value]) => {
            const bus = value as any;
            return {
              id,
              placa: bus.placa ?? '',
              modelo: bus.modelo ?? '',
              estado: bus.estado ?? 'INACTIVO',
              activo: bus.activo ?? false,
              latitud: bus.latitud ?? 0,
              longitud: bus.longitud ?? 0,
              velocidad: bus.velocidad ?? 0,
              ruta: bus.ruta ?? undefined,
              rutaId: bus.rutaId ?? undefined,
            };
          }
        );

        console.log(
          `[FirebaseService] ${busesArray.length} buses obtenidos para la empresa ${empresaId}`
        );
        subscriber.next(busesArray);
      };

      const errorHandler = (error: any) => {
        console.error(
          `[FirebaseService] Error en streamBusesByEmpresa:`,
          error
        );
        subscriber.error(error);
      };

      onValue(busesRef, handler, errorHandler);

      return () => {
        console.log(
          `[FirebaseService] Desuscribiendo de buses de empresa ${empresaId}`
        );
        off(busesRef, 'value', handler);
      };
    });
  }

  /**
   * Método para encontrar la primera empresa que tiene buses activos.
   * @returns Observable con el ID de la empresa o null
   */
  findFirstEmpresaWithBuses(): Observable<number | null> {
    return new Observable((subscriber) => {
      const path = 'empresas';
      const empresasRef = ref(this.db, path);

      console.log(`[FirebaseService] Buscando empresas con buses en: ${path}`);

      const handler = (snapshot: any) => {
        if (!snapshot.exists()) {
          console.log(
            '[FirebaseService] No se encontraron empresas con buses activos.'
          );
          subscriber.next(null);
          subscriber.complete();
          return;
        }

        const empresas = snapshot.val();
        const empresaIds = Object.keys(empresas);

        for (const empresaId of empresaIds) {
          const empresa = empresas[empresaId];
          if (empresa?.buses && Object.keys(empresa.buses).length > 0) {
            console.log(
              `[FirebaseService] Empresa encontrada con buses: ${empresaId}`
            );
            subscriber.next(Number(empresaId));
            subscriber.complete();
            return;
          }
        }

        console.log(
          '[FirebaseService] No se encontraron empresas con buses activos.'
        );
        subscriber.next(null);
        subscriber.complete();
      };

      const errorHandler = (error: any) => {
        console.error(
          `[FirebaseService] Error en findFirstEmpresaWithBuses:`,
          error
        );
        subscriber.error(error);
      };

      onValue(empresasRef, handler, { onlyOnce: true });

      return () => off(empresasRef, 'value', handler);
    });
  }

  /**
   * Método para obtener todos los buses de una empresa y opcionalmente filtrar por ruta.
   * @param empresaId ID de la empresa
   * @param rutaId ID de la ruta (opcional)
   * @param soloActivos Si solo se deben retornar buses activos
   * @returns Observable con array de buses con posición
   */
  streamBusesByEmpresaAndRoute(
    empresaId: number,
    rutaId?: number,
    soloActivos = false
  ): Observable<BusWithPosition[]> {
    return new Observable((subscriber) => {
      const path = `empresas/${empresaId}/buses`;
      const busesRef = ref(this.db, path);
      //console.log(`[FirebaseService] Consultando buses por empresa y ruta en: ${path}`);
      const handler = (snapshot: any) => {
        if (!snapshot.exists()) {
          //console.log(`[FirebaseService] No se encontraron buses para empresa: ${empresaId}`);
          subscriber.next([]);
          return;
        }

        const raw = snapshot.val();
        let arr: BusWithPosition[] = Object.entries(raw).map(([key, value]) => {
          const bus = value as any;
          return {
            id: key,
            placa: bus.placa ?? '',
            modelo: bus.modelo ?? '',
            estado: bus.estado ?? 'INACTIVO',
            activo: bus.activo ?? false,
            latitud: bus.latitud ?? 0,
            longitud: bus.longitud ?? 0,
            velocidad: bus.velocidad ?? 0,
            rutaId: bus.rutaId ?? undefined,
            ruta: bus.ruta ?? undefined,
            position: {
              lat: bus.latitud ?? 0,
              lng: bus.longitud ?? 0,
            },
          };
        });

        // Filtrar por ruta si se especifica
        if (rutaId != null) {
          arr = arr.filter((b) => b.rutaId === rutaId);
        }

        // Filtrar solo activos si se especifica
        if (soloActivos) {
          arr = arr.filter((b) => b.activo === true);
        }

        console.log(
          `[FirebaseService] ${arr.length} buses obtenidos para empresa ${empresaId}` +
            (rutaId ? ` y ruta ${rutaId}` : '') +
            (soloActivos ? ' (solo activos)' : '')
        );
        subscriber.next(arr);
      };

      const errorHandler = (error: any) => {
        console.error(
          `[FirebaseService] Error en streamBusesByEmpresaAndRoute:`,
          error
        );
        subscriber.error(error);
      };

      onValue(busesRef, handler, errorHandler);

      return () => {
        console.log(
          `[FirebaseService] Desuscribiendo de buses por empresa y ruta`
        );
        off(busesRef, 'value', handler);
      };
    });
  }

  /**
   * Método para actualizar el estado de un bus.
   * @param empresaId ID de la empresa
   * @param busId ID del bus
   * @param newState Nuevo estado del bus
   */
  async updateBusState(
    empresaId: number,
    busId: string,
    newState: string
  ): Promise<void> {
    const busRef = ref(this.db, `empresas/${empresaId}/buses/${busId}`);
    try {
      await update(busRef, { estado: newState });
      console.log(
        `[FirebaseService] Estado del bus ${busId} actualizado a: ${newState}`
      );
    } catch (error) {
      console.error(
        `[FirebaseService] Error al actualizar estado del bus ${busId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Método para actualizar el estado de un comentario específico.
   * Este método actualiza el campo 'status' dentro de calificaciones de un bus.
   * @param empresaId ID de la empresa
   * @param busId ID del bus (puede ser string o number)
   * @param commentId ID del comentario
   * @param newState Nuevo estado del comentario
   */
  async updateCommentState(
    empresaId: number,
    busId: string | number,
    commentId: string,
    newState: 'pendiente' | 'revisado' | 'resuelto'
  ): Promise<void> {
    // Convertimos busId a string para evitar problemas
    const validBusId = typeof busId === 'number' ? String(busId) : busId;

    // Validación de parámetros
    if (!validBusId || validBusId === 'NaN' || validBusId === 'undefined') {
      const error = `Invalid busId detected: ${busId}`;
      console.error(`[FirebaseService] ${error}`);
      throw new Error(error);
    }

    if (!commentId || commentId === 'undefined') {
      const error = `Invalid commentId detected: ${commentId}`;
      console.error(`[FirebaseService] ${error}`);
      throw new Error(error);
    }

    // Ruta exacta al comentario dentro de calificaciones
    const commentPath = `empresas/${empresaId}/buses/${validBusId}/calificaciones/${commentId}`;
    const commentRef = ref(this.db, commentPath);

    console.log(
      `[FirebaseService] Actualizando estado de comentario en: ${commentPath} a '${newState}'`
    );

    try {
      // Actualizamos solo el campo 'status'
      await update(commentRef, { status: newState });

      console.log(
        `[FirebaseService] ✓ Estado del comentario ${commentId} del bus ${validBusId} actualizado a: ${newState}`
      );
    } catch (error) {
      console.error(
        `[FirebaseService] ✗ Error al actualizar comentario ${commentId} del bus ${validBusId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Método para obtener un comentario específico (útil para debugging).
   * @param empresaId ID de la empresa
   * @param busId ID del bus
   * @param commentId ID del comentario
   * @returns Promise con el comentario o null
   */
  async getComment(
    empresaId: number,
    busId: string | number,
    commentId: string
  ): Promise<CommentFirebase | null> {
    const validBusId = typeof busId === 'number' ? String(busId) : busId;
    const commentPath = `empresas/${empresaId}/buses/${validBusId}/calificaciones/${commentId}`;
    const commentRef = ref(this.db, commentPath);

    try {
      const snapshot = await get(commentRef);

      if (!snapshot.exists()) {
        console.log(
          `[FirebaseService] Comentario no encontrado: ${commentPath}`
        );
        return null;
      }

      const data = snapshot.val();
      return {
        id: commentId,
        comment: data.comment ?? '',
        stars: data.stars ?? 0,
        date_time_str: data.date_time_str ?? '',
        timestamp: data.timestamp ?? Date.now(),
        status: data.status ?? 'pendiente',
        category: data.category ?? 'otro',
        userRole: data.userRole ?? 'Usuario desconocido',
      };
    } catch (error) {
      console.error(`[FirebaseService] Error al obtener comentario:`, error);
      throw error;
    }
  }

  /**
   * Método para agregar un nuevo comentario a un bus.
   * @param empresaId ID de la empresa
   * @param busId ID del bus
   * @param comment Datos del comentario
   * @returns Promise con el ID del nuevo comentario
   */
  async addComment(
    empresaId: number,
    busId: string | number,
    comment: {
      comment: string;
      stars: number;
      userRole?: string;
      category?: string;
    }
  ): Promise<string | null> {
    const validBusId = typeof busId === 'number' ? String(busId) : busId;
    const commentsPath = `empresas/${empresaId}/buses/${validBusId}/calificaciones`;
    const commentsRef = ref(this.db, commentsPath);

    try {
      const newCommentRef = push(commentsRef);
      const timestamp = Date.now();
      const date = new Date(timestamp);

      await set(newCommentRef, {
        comment: comment.comment,
        stars: comment.stars,
        userRole: comment.userRole ?? 'Usuario',
        category: comment.category ?? 'otro',
        status: 'pendiente',
        timestamp: timestamp,
        date_time_str: date.toLocaleString('es-ES'),
      });

      console.log(
        `[FirebaseService] ✓ Comentario agregado exitosamente con ID: ${newCommentRef.key}`
      );
      return newCommentRef.key;
    } catch (error) {
      console.error(`[FirebaseService] ✗ Error al agregar comentario:`, error);
      throw error;
    }
  }

  /**
   * Método para eliminar un comentario (opcional, por si lo necesitas).
   * @param empresaId ID de la empresa
   * @param busId ID del bus
   * @param commentId ID del comentario
   */
  async deleteComment(
    empresaId: number,
    busId: string | number,
    commentId: string
  ): Promise<void> {
    const validBusId = typeof busId === 'number' ? String(busId) : busId;
    const commentPath = `empresas/${empresaId}/buses/${validBusId}/calificaciones/${commentId}`;
    const commentRef = ref(this.db, commentPath);

    try {
      await set(commentRef, null);
      console.log(
        `[FirebaseService] ✓ Comentario ${commentId} eliminado exitosamente`
      );
    } catch (error) {
      console.error(`[FirebaseService] ✗ Error al eliminar comentario:`, error);
      throw error;
    }
  }
}
