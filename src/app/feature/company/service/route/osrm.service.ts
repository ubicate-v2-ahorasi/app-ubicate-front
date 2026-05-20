import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

export interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: string;
  legs: any[];
}

export interface OsrmResponse {
  code: string;
  routes: OsrmRoute[];
  waypoints: any[];
}

@Injectable({ providedIn: 'root' })
export class OsrmService {
  private http = inject(HttpClient);
  private baseUrl = 'https://router.project-osrm.org';

  calculateRoute(waypoints: { lat: number; lng: number }[]): Observable<OsrmRoute | null> {
    if (waypoints.length < 2) {
      return of(null);
    }

    const coordinates = waypoints
      .map(wp => `${wp.lng},${wp.lat}`)
      .join(';');

    const url = `${this.baseUrl}/route/v1/driving/${coordinates}?geometries=polyline&overview=full&steps=false&generate_hints=false`;

    return this.http.get<OsrmResponse>(url).pipe(
      map(response => {
        if (response.code === 'Ok' && response.routes && response.routes.length > 0) {
          return response.routes[0];
        }
        console.warn('OSRM: No route found', response);
        return null;
      }),
      catchError(error => {
        console.error('OSRM error:', error);
        return of(null);
      })
    );
  }

  getRouteBetweenTwoPoints(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Observable<OsrmRoute | null> {
    return this.calculateRoute([origin, destination]);
  }

  decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
    const poly: google.maps.LatLngLiteral[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    try {
      while (index < len) {
        let b: number;
        let shift = 0;
        let result = 0;

        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);

        const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lat += dlat;

        shift = 0;
        result = 0;

        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);

        const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
        lng += dlng;

        poly.push({
          lat: lat / 1e5,
          lng: lng / 1e5
        });
      }
    } catch (e) {
      console.error('Error decoding polyline:', e);
      return [];
    }

    return poly;
  }
}