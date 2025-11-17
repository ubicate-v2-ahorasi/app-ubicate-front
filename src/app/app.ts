import { Component, signal } from '@angular/core';
import { FirebaseService } from './core/service/firebase.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  protected readonly title = signal('ubicate-taller-2');

  constructor(private firebaseService: FirebaseService) {}

  addTestData() {
    const testData = { name: 'Pablo Gay', createdAt: new Date() };
    this.firebaseService
      .addTestData(testData)
      .then(() => console.log('Dato registrado con éxito en Firebase!'))
      .catch((error) => console.error('Error al registrar el dato:', error));
  }


}
