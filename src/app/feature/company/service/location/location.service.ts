import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private currentLocationSubject =
    new BehaviorSubject<google.maps.LatLngLiteral | null>(null);
  private isLocatingSubject = new BehaviorSubject<boolean>(false);
  private locationMarker: google.maps.Marker | null = null;

  currentLocation$ = this.currentLocationSubject.asObservable();
  isLocating$ = this.isLocatingSubject.asObservable();

  async getCurrentLocation(): Promise<google.maps.LatLngLiteral> {
    if (this.isLocatingSubject.value) {
      throw new Error('Location request in progress');
    }

    this.isLocatingSubject.next(true);

    try {
      const position = await this.getGeolocation();
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      this.currentLocationSubject.next(location);
      return location;
    } catch (error) {
      throw error;
    } finally {
      this.isLocatingSubject.next(false);
    }
  }

  private getGeolocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      });
    });
  }

  async createLocationMarker(
    map: google.maps.Map,
    location: google.maps.LatLngLiteral
  ): Promise<void> {
    this.clearLocationMarker();

    this.locationMarker = new google.maps.Marker({
      position: location,
      map: map,
      title: 'Tu ubicación',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
    });
  }

  clearLocationMarker(): void {
    if (this.locationMarker) {
      this.locationMarker.setMap(null);
      this.locationMarker = null;
    }
  }
}
