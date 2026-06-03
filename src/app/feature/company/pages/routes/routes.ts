import { Component } from '@angular/core';
import { RouteManagementTable } from '../../components/route-management/route-management-table';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [RouteManagementTable],
  templateUrl: './routes.html',
})
export class RoutesPage {}
