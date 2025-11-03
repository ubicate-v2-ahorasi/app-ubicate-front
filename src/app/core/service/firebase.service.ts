import { Injectable } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  get,
  onValue,
  off,
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

  async addTestData(data: any) {
    const listRef = ref(this.db, 'testCollection');
    const newItemRef = push(listRef);
    await set(newItemRef, { ...data, createdAt: new Date().toISOString() });
    return newItemRef.key;
  }

  async getTestData() {
    const listRef = ref(this.db, 'testCollection');
    const snapshot = await get(listRef);
    return snapshot.exists() ? snapshot.val() : null;
  }

  streamBusesByEmpresaAndRoute(
    empresaId: number,
    rutaId?: number,
    soloActivos = true
  ): Observable<BusWithPosition[]> {
    return new Observable<BusWithPosition[]>((sub) => {
      const busesRef = ref(this.db, `empresas/${empresaId}/buses`);

      const handler = (snapshot: any) => {
        if (!snapshot.exists()) {
          sub.next([]);
          return;
        }

        const raw = snapshot.val();
        if (!raw) {
          sub.next([]);
          return;
        }

        let arr: BusWithPosition[] = Object.entries(raw).map(
          ([key, val]: [string, any]) => ({
            id: String(key),
            ...val,
            rutaId: val?.rutaId,
            position: {
              lat: Number(val?.latitud),
              lng: Number(val?.longitud),
            },
          })
        );

        if (rutaId != null) {
          arr = arr.filter((b) => Number(b.rutaId) === Number(rutaId));
        }

        if (soloActivos) {
          arr = arr.filter((b) => b.activo === true && b.estado !== 'INACTIVO');
        }

        arr = arr.filter(
          (b) =>
            Number.isFinite(b.position.lat) &&
            Number.isFinite(b.position.lng) &&
            b.position.lat !== 0 &&
            b.position.lng !== 0
        );

        sub.next(arr);
      };

      onValue(busesRef, handler);
      return () => off(busesRef, 'value', handler);
    });
  }

  findFirstEmpresaWithBuses(): Observable<number | null> {
    return new Observable((observer) => {
      const empresasRef = ref(this.db, 'empresas');

      const callback = (snapshot: any) => {
        if (!snapshot.exists()) {
          observer.next(null);
          return;
        }

        const empresas = snapshot.val();
        const empresaIds = Object.keys(empresas);

        for (const empresaId of empresaIds) {
          const empresa = empresas[empresaId];
          if (empresa?.buses && Object.keys(empresa.buses).length > 0) {
            observer.next(Number(empresaId));
            return;
          }
        }

        observer.next(null);
      };

      onValue(empresasRef, callback, { onlyOnce: true });
      return () => off(empresasRef, 'value', callback);
    });
  }
}
