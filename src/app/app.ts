import { Component, signal } from '@angular/core';
import { FirebaseService } from './core/service/firebase.service';
import { RouterOutlet, ChildrenOutletContexts } from '@angular/router';
import { fadeAnimation } from './core/utils/route-animations';
import { ThemeService } from './core/service/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  animations: [fadeAnimation],
})
export class App {
  protected readonly title = signal('ubicate-taller-2');

  constructor(
    private firebaseService: FirebaseService,
    private contexts: ChildrenOutletContexts,
    private themeService: ThemeService
  ) {}

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }

  addTestData() {
    const testData = { name: 'Pablo Gay', createdAt: new Date() };
    this.firebaseService
      .addTestData(testData)
      .then(() => {})
      .catch((error) => {});
  }


}
