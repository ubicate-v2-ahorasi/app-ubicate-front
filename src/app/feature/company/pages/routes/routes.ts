import { Component } from '@angular/core';
import { RouteManagementTable } from '../../components/route-management/route-management-table';
import { IconsModule } from '../../icons.module';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [RouteManagementTable, IconsModule],
  templateUrl: './routes.html',
})
export class RoutesPage {}
