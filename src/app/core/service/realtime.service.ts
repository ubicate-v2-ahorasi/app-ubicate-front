import { Injectable } from '@angular/core';
import { Client, Message, IFrame } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../config/environment';

export interface BusLocation {
  busId: number;
  placa: string;
  latitud: number;
  longitud: number;
  velocidad: number;
  estado: string;
  timestamp: string;
  empresaId: number;
  rutaId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private stompClient: Client | null = null;
  private connectionStatus$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.initWebSocket();
  }

  private initWebSocket() {
    const socket = new SockJS(environment.wsUrl);
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      debug: (str: string) => console.log('[STOMP] ' + str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.stompClient.onConnect = (frame: IFrame) => {
      console.log('[RealtimeService] Conectado a WebSocket');
      this.connectionStatus$.next(true);
    };

    this.stompClient.onStompError = (frame: IFrame) => {
      console.error('[RealtimeService] Error STOMP:', frame.headers['message']);
      this.connectionStatus$.next(false);
    };

    this.stompClient.activate();
  }

  /**
   * Suscribirse a las actualizaciones de ubicación de buses de una empresa
   */
  watchBusesByEmpresa(empresaId: number): Observable<BusLocation> {
    return new Observable<BusLocation>((observer) => {
      const topic = `/topic/empresa/${empresaId}/buses`;
      
      const subscribe = () => {
        if (this.stompClient && this.stompClient.connected) {
          const subscription = this.stompClient.subscribe(topic, (message: Message) => {
            const body = JSON.parse(message.body);
            observer.next(body);
          });
          return subscription;
        }
        return null;
      };

      let currentSubscription: any = subscribe();

      // Si no estaba conectado, intentar suscribirse cuando lo esté
      const statusSub = this.connectionStatus$.subscribe((connected) => {
        if (connected && !currentSubscription) {
          currentSubscription = subscribe();
        }
      });

      return () => {
        if (currentSubscription) currentSubscription.unsubscribe();
        statusSub.unsubscribe();
      };
    });
  }

  /**
   * Suscribirse a un bus específico
   */
  watchBus(busId: number): Observable<BusLocation> {
    return new Observable<BusLocation>((observer) => {
      const topic = `/topic/bus/${busId}`;
      
      if (this.stompClient && this.stompClient.connected) {
        const subscription = this.stompClient.subscribe(topic, (message: Message) => {
          observer.next(JSON.parse(message.body));
        });
        return () => subscription.unsubscribe();
      }
      return () => {};
    });
  }

  isConnected(): Observable<boolean> {
    return this.connectionStatus$.asObservable();
  }
}
