import { Component, OnInit, OnDestroy } from '@angular/core';
import { FirebaseService } from '../../../../core/service/firebase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

export interface Comment {
  id: string;
  busId: string; // Agregamos busId para identificar el bus
  busPlaca: string;
  userRole: string;
  userAvatar?: string;
  content: string;
  rating: number;
  date: Date;
  category: 'servicio' | 'conductor' | 'vehiculo' | 'puntualidad' | 'otro';
  status: 'pendiente' | 'revisado' | 'resuelto';
}

@Component({
  selector: 'app-comments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comments.html',
  styleUrls: ['./comments.css'],
})
export class Comments implements OnInit, OnDestroy {
  comments: Comment[] = [];
  filteredComments: Comment[] = [];
  paginatedComments: Comment[] = [];

  selectedCategory: string = 'todas';
  selectedStatus: string = 'todos';
  selectedRating: string = 'todas';
  searchTerm: string = '';

  viewMode: 'detailed' | 'compact' =
    (localStorage.getItem('commentsViewMode') as 'detailed' | 'compact') ||
    'detailed';

  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 0;

  Math = Math;

  // Mapa para gestionar suscripciones por bus
  private busSubscriptions = new Map<string, Subscription>();
  private empresaId: number | null = null;

  stats = {
    total: 0,
    pendientes: 0,
    revisados: 0,
    resueltos: 0,
    promedioRating: 0,
  };

  statusOptions = [
    { value: 'todos', label: 'Todos los estados', color: 'gray' },
    { value: 'pendiente', label: 'Pendiente', color: 'yellow' },
    { value: 'revisado', label: 'Revisado', color: 'blue' },
    { value: 'resuelto', label: 'Resuelto', color: 'green' },
  ];

  ratingOptions = [
    { value: 'todas', label: 'Todas las estrellas' },
    { value: '5', label: '⭐⭐⭐⭐⭐ (5 estrellas)' },
    { value: '4', label: '⭐⭐⭐⭐ (4 estrellas)' },
    { value: '3', label: '⭐⭐⭐ (3 estrellas)' },
    { value: '2', label: '⭐⭐ (2 estrellas)' },
    { value: '1', label: '⭐ (1 estrella)' },
  ];

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit(): void {
    this.loadCommentsFromFirebase();
  }

  ngOnDestroy(): void {
    // Limpiar todas las suscripciones
    this.busSubscriptions.forEach((sub) => sub.unsubscribe());
    this.busSubscriptions.clear();
  }

  loadCommentsFromFirebase(): void {
    const authUser = localStorage.getItem('auth_user');
    if (!authUser) {
      console.error('auth_user no encontrado en localStorage');
      return;
    }

    this.empresaId = JSON.parse(authUser)?.empresa_id;
    if (!this.empresaId) {
      console.error('No se encontró un empresa_id válido en auth_user');
      return;
    }

    // Primero obtenemos los buses
    this.firebaseService
      .streamBusesByEmpresaAndRoute(this.empresaId)
      .subscribe({
        next: (buses) => {
          console.log('Buses obtenidos para empresa:', this.empresaId, buses);

          if (!buses || buses.length === 0) {
            console.log('No se encontraron buses para esta empresa.');
            return;
          }

          buses.forEach((bus) => {
            // Si ya existe una suscripción para este bus, la cancelamos
            if (this.busSubscriptions.has(bus.id)) {
              this.busSubscriptions.get(bus.id)?.unsubscribe();
            }

            // Creamos una nueva suscripción para los comentarios del bus
            const subscription = this.firebaseService
              .streamBusComments(this.empresaId!, Number(bus.id))
              .subscribe({
                next: (comments) => {
                  // Actualizamos los comentarios de este bus específico
                  this.updateBusComments(bus, comments);
                },
                error: (err) => {
                  console.error(
                    `Error al obtener comentarios del bus ${bus.id}:`,
                    err
                  );
                },
              });

            // Guardamos la suscripción
            this.busSubscriptions.set(bus.id, subscription);
          });
        },
        error: (err) => {
          console.error(
            `Error al obtener los buses para la empresa ${this.empresaId}:`,
            err
          );
        },
      });
  }

  updateBusComments(bus: any, newComments: any[]): void {
    // Removemos los comentarios antiguos de este bus
    this.comments = this.comments.filter((c) => c.busId !== bus.id);

    // Agregamos los nuevos comentarios
    const busComments: Comment[] = newComments.map((comment) => ({
      id: comment.id,
      busId: bus.id, // Guardamos el ID del bus
      busPlaca: bus.placa,
      userRole: comment.userRole ?? 'Usuario desconocido',
      content: comment.comment,
      date: new Date(comment.timestamp),
      rating: comment.stars,
      category: comment.category ?? 'otro',
      status: comment.status ?? 'pendiente',
    }));

    this.comments = [...this.comments, ...busComments];

    // Ordenamos por fecha descendente (más recientes primero)
    this.comments.sort((a, b) => b.date.getTime() - a.date.getTime());

    this.applyFilters();
    this.calculateStats();
  }

  calculateStats(): void {
    this.stats.total = this.comments.length;
    this.stats.pendientes = this.comments.filter(
      (c) => c.status === 'pendiente'
    ).length;
    this.stats.revisados = this.comments.filter(
      (c) => c.status === 'revisado'
    ).length;
    this.stats.resueltos = this.comments.filter(
      (c) => c.status === 'resuelto'
    ).length;

    const totalRatings = this.comments.reduce((sum, c) => sum + c.rating, 0);
    this.stats.promedioRating =
      this.comments.length > 0
        ? Math.round((totalRatings / this.comments.length) * 10) / 10
        : 0;
  }

  applyFilters(): void {
    this.filteredComments = this.comments.filter((comment) => {
      const matchesCategory =
        this.selectedCategory === 'todas' ||
        comment.category === this.selectedCategory;
      const matchesStatus =
        this.selectedStatus === 'todos' ||
        comment.status === this.selectedStatus;
      const matchesRating =
        this.selectedRating === 'todas' ||
        comment.rating === parseInt(this.selectedRating);
      const matchesSearch =
        !this.searchTerm ||
        comment.busPlaca
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        comment.content.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchesCategory && matchesStatus && matchesRating && matchesSearch;
    });

    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredComments.length / this.pageSize);
    const start = this.currentPage * this.pageSize;
    this.paginatedComments = this.filteredComments.slice(
      start,
      start + this.pageSize
    );
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.currentPage = 0; // Resetear a primera página
    this.applyFilters();
  }

  setViewMode(mode: 'detailed' | 'compact'): void {
    this.viewMode = mode;
    localStorage.setItem('commentsViewMode', mode);
  }

  onRatingChange(rating: string): void {
    this.selectedRating = rating;
    this.currentPage = 0;
    this.applyFilters();
  }

  onStatusChange(status: string): void {
    this.selectedStatus = status;
    this.currentPage = 0;
    this.applyFilters();
  }

  changeCommentStatus(
    comment: Comment,
    newStatus: 'pendiente' | 'revisado' | 'resuelto'
  ): void {
    if (!this.empresaId) {
      console.error('No se encontró empresa_id');
      return;
    }

    const busId = comment.busId; // Usamos el busId guardado
    const commentId = comment.id;

    if (!busId || !commentId) {
      console.error(`Invalid busId or commentId: ${busId}, ${commentId}`);
      return;
    }

    // NO actualizamos el estado local aquí, dejamos que Firebase lo haga
    // mediante el observable que ya está escuchando

    this.firebaseService
      .updateCommentState(this.empresaId, busId, commentId, newStatus)
      .then(() => {
        console.log(
          `Estado del comentario ${commentId} actualizado a: ${newStatus}`
        );
        // El cambio se reflejará automáticamente a través del observable
      })
      .catch((error) => {
        console.error(`Error al actualizar el comentario ${commentId}:`, error);
      });
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.updatePagination();
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    return `Hace ${diffDays} días`;
  }

  getRatingStars(rating: number): string[] {
    return Array(5)
      .fill('★')
      .map((_, i) => (i < rating ? '★' : '☆'));
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'revisado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resuelto':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm.trim() ||
      this.selectedStatus !== 'todos' ||
      this.selectedRating !== 'todas' ||
      this.selectedCategory !== 'todas'
    );
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = 'todas';
    this.selectedStatus = 'todos';
    this.selectedRating = 'todas';
    this.currentPage = 0;
    this.applyFilters();
  }
}
