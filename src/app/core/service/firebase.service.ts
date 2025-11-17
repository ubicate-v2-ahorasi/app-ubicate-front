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

  // Método para obtener los comentarios de un bus específico.
  streamBusComments(empresaId: number, busId: number): Observable<any[]> {
    return new Observable<any[]>((subscriber) => {
      const path = `empresas/${empresaId}/buses/${busId}/calificaciones`;
      const commentsRef = ref(this.db, path);

      console.log(`Consultando Firebase en: ${path}`);

      const handler = (snapshot: any) => {
        if (!snapshot.exists()) {
          console.log(`No hay comentarios en: ${path}`);
          subscriber.next([]);
          return;
        }

        const rawComments = snapshot.val();
        const commentsArray = Object.entries(rawComments).map(
          ([key, value]) => ({
            id: key,
            comment: (value as any).comment,
            stars: (value as any).stars,
            date_time_str: (value as any).date_time_str,
            timestamp: (value as any).timestamp,
          })
        );

        console.log(
          `Comentarios obtenidos para el bus ${busId}:`,
          commentsArray
        );
        subscriber.next(commentsArray);
      };

      onValue(commentsRef, handler);
      return () => off(commentsRef, 'value', handler);
    });
  }

  // Método para obtener todos los buses de una empresa.
  streamBusesByEmpresa(empresaId: number): Observable<BusFirebase[]> {
    return new Observable((subscriber) => {
      const path = `empresas/${empresaId}/buses`;
      const busesRef = ref(this.db, path);

      console.log(`Consultando Firebase en: ${path}`);

      const handler = (snapshot: any) => {
        if (!snapshot.exists()) {
          console.log(`No hay buses en: ${path}`);
          subscriber.next([]);
          return;
        }

        const rawBuses = snapshot.val();
        const busesArray = Object.entries(rawBuses).map(([id, value]) => {
          const bus = value as BusFirebase;
          return {
            id,
            placa: bus.placa ?? '',
            modelo: bus.modelo ?? '',
            estado: bus.estado ?? 'INACTIVO',
            activo: bus.activo ?? false,
            latitud: bus.latitud ?? 0,
            longitud: bus.longitud ?? 0,
            velocidad: bus.velocidad ?? 0,
            ruta: bus.ruta ?? undefined, // Cambiado de `null` a `undefined` para ser compatible
            rutaId: bus.rutaId ?? undefined, // Cambiado de `null` a `undefined`
          };
        });

        console.log(
          `Buses obtenidos para la empresa ${empresaId}:`,
          busesArray
        );
        subscriber.next(busesArray);
      };

      onValue(busesRef, handler, { onlyOnce: false });
      return () => off(busesRef, 'value', handler);
    });
  }

  // Método para encontrar la primera empresa que tiene buses activos.
  findFirstEmpresaWithBuses(): Observable<number | null> {
    return new Observable((subscriber) => {
      const path = 'empresas';
      const empresasRef = ref(this.db, path);

      console.log(`Consultando Firebase en: ${path}`);

      const handler = (snapshot: any) => {
        if (!snapshot.exists()) {
          console.log('No se encontraron empresas con buses activos.');
          subscriber.next(null);
          return;
        }

        const empresas = snapshot.val();
        const empresaIds = Object.keys(empresas);

        for (const empresaId of empresaIds) {
          const empresa = empresas[empresaId];
          if (empresa?.buses && Object.keys(empresa.buses).length > 0) {
            console.log(`Empresa encontrada con buses activos: ${empresaId}`);
            subscriber.next(Number(empresaId));
            return;
          }
        }

        console.log('No se encontraron empresas con buses activos.');
        subscriber.next(null);
      };

      onValue(empresasRef, handler, { onlyOnce: true });
      return () => off(empresasRef, 'value', handler);
    });
  }

  // Método para obtener todos los buses de una empresa y ruta.
  streamBusesByEmpresaAndRoute(
    empresaId: number,
    rutaId?: number,
    soloActivos = true
  ): Observable<BusWithPosition[]> {
    return new Observable((subscriber) => {
      const path = `empresas/${empresaId}/buses`;
      const busesRef = ref(this.db, path);

      console.log(`Consultando Firebase en: ${path}`);

      const handler = (snapshot: any) => {
        if (!snapshot.exists()) {
          console.log(`No buses found for empresa: ${empresaId}`);
          subscriber.next([]);
          return;
        }

        const raw = snapshot.val();
        let arr: BusWithPosition[] = Object.entries(raw).map(([key, value]) => {
          const bus = value as BusFirebase;
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
            position: {
              lat: bus.latitud ?? 0,
              lng: bus.longitud ?? 0,
            },
          };
        });

        if (rutaId != null) {
          arr = arr.filter((b) => b.rutaId === rutaId);
        }

        console.log(`Buses obtenidos para empresa ${empresaId}:`, arr);
        subscriber.next(arr);
      };

      onValue(busesRef, handler);
      return () => off(busesRef, 'value', handler);
    });
  }
  async updateBusState(
    empresaId: number,
    busId: string,
    newState: string
  ): Promise<void> {
    const busRef = ref(this.db, `empresas/${empresaId}/buses/${busId}`);
    try {
      await update(busRef, { estado: newState });
      console.log(`Estado del bus ${busId} actualizado a ${newState}`);
    } catch (error) {
      console.error(`Error al actualizar el estado del bus ${busId}:`, error);
    }
  }
  async updateCommentState(
    empresaId: number,
    busId: string | number,
    commentId: string,
    newState: string
  ): Promise<void> {
    // Convertimos busId a cadena para evitar problemas como `NaN`
    const validBusId = typeof busId === 'number' ? String(busId) : busId;

    // Validamos que busId y commentId sean válidos antes de proceder
    if (!validBusId || validBusId === 'NaN') {
      console.error(`Invalid busId detected: ${busId}`);
      return;
    }

    if (!commentId) {
      console.error(`Invalid commentId detected: ${commentId}`);
      return;
    }

    // Ruta exacta al nodo del comentario dentro del bus en calificaciones
    const commentRef = ref(
      this.db,
      `empresas/${empresaId}/buses/${validBusId}/calificaciones/${commentId}`
    );

    try {
      // Actualizamos únicamente el atributo `status` dentro del comentario
      await update(commentRef, { status: newState });
      console.log(
        `Estado del comentario ${commentId} dentro del bus ${validBusId} actualizado a: ${newState}.`
      );
    } catch (error) {
      console.error(
        `Error al actualizar el estado del comentario ${commentId} del bus ${validBusId}:`,
        error
      );
    }
  }
}
