// src/app/shared/icons/icons.module.ts
import { NgModule } from '@angular/core';
import {
  LucideAngularModule,
  Home,
  Bus,
  MapPin,
  X,
  Search,
  RefreshCw,
  Crosshair,
  Route,
  Trash2,
  Edit,
  Loader2,
  Sun,
  Moon,
} from 'lucide-angular';

const icons = {
  Home,
  Bus,
  MapPin,
  X,
  Search,
  RefreshCw,
  Crosshair,
  Route,
  Trash2,
  Edit,
  Loader2,
  Sun,
  Moon,
};

@NgModule({
  imports: [LucideAngularModule.pick(icons)],
  exports: [LucideAngularModule],
})
export class IconsModule {}
