// src/app/core/service/firebase.service.ts
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
        let arr: BusWithPosition[] = Object.entries(raw).map(
          ([key, val]: [string, any]) => ({
            id: String(key),
            ...val,
            rutaId: val?.rutaId,
            position: { lat: Number(val?.latitud), lng: Number(val?.longitud) },
          })
        );

        if (rutaId != null) {
          const r = Number(rutaId);
          arr = arr.filter((b) => Number(b.rutaId) === r);
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

      onValue(busesRef, handler, { onlyOnce: false });
      return () => off(busesRef, 'value', handler);
    });
  }
}
