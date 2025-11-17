import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../../../core/service/firebase.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Comment {
  id: string; // Cambiado ID a string para Firebase
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
  imports: [CommonModule, FormsModule],
  templateUrl: './comments.html',
  styleUrls: ['./comments.css'],
})
export class Comments implements OnInit {
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

  loadCommentsFromFirebase(): void {
    this.comments = []; // Limpiamos comentarios al reiniciar carga

    const authUser = localStorage.getItem('auth_user');
    if (!authUser) {
      console.error('auth_user no encontrado en localStorage');
      return;
    }

    const empresaId = JSON.parse(authUser)?.empresa_id; // Obtener empresa ID
    if (!empresaId) {
      console.error('No se encontró un empresa_id válido en auth_user');
      return;
    }

    this.firebaseService.streamBusesByEmpresaAndRoute(empresaId).subscribe({
      next: (buses) => {
        console.log('Buses obtenidos para empresa:', empresaId, buses);

        if (!buses || buses.length === 0) {
          console.log('No se encontraron buses para esta empresa.');
          return;
        }

        buses.forEach((bus) => {
          console.log(`Consultando comentarios para el bus: ${bus.id}`);

          this.firebaseService
            .streamBusComments(empresaId, Number(bus.id))
            .subscribe({
              next: (comments) => {
                if (!comments || comments.length === 0) {
                  console.log(`El bus ${bus.id} no tiene comentarios.`);
                  return;
                }

                const busComments: Comment[] = comments.map((comment) => ({
                  id: comment.id,
                  busPlaca: bus.placa,
                  userRole: comment.userRole ?? 'Usuario desconocido',
                  content: comment.comment,
                  date: new Date(comment.timestamp),
                  rating: comment.stars,
                  category: comment.category ?? 'otro',
                  status: comment.status ?? 'pendiente', // Estado por defecto
                }));

                // Evitar duplicados en la lista de comentarios
                const uniqueComments = busComments.filter(
                  (newComment) =>
                    !this.comments.some(
                      (existingComment) => existingComment.id === newComment.id
                    )
                );

                this.comments = [...this.comments, ...uniqueComments];
                this.applyFilters(); // Reaplicar filtros después de cargar
                this.calculateStats(); // Recalcular estadísticas
              },
              error: (err) => {
                console.error(
                  `Error al obtener comentarios del bus ${bus.id}:`,
                  err
                );
              },
            });
        });
      },
      error: (err) => {
        console.error(
          `Error al obtener los buses para la empresa ${empresaId}:`,
          err
        );
      },
    });
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
    this.applyFilters();
  }
  setViewMode(mode: 'detailed' | 'compact'): void {
    this.viewMode = mode;
    localStorage.setItem('commentsViewMode', mode);
  }

  onRatingChange(rating: string): void {
    this.selectedRating = rating;
    this.applyFilters();
  }

  onStatusChange(status: string): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  changeCommentStatus(
    comment: Comment,
    newStatus: 'pendiente' | 'revisado' | 'resuelto'
  ): void {
    // Recuperamos el usuario autenticado desde localStorage
    const authUser = localStorage.getItem('auth_user');
    if (!authUser) {
      console.error('auth_user no encontrado en localStorage');
      return;
    }

    const empresaId = JSON.parse(authUser)?.empresa_id; // Obtener empresa ID
    if (!empresaId) {
      console.error('No se encontró un empresa_id válido en auth_user.');
      return;
    }

    const busId = comment.busPlaca; // ID único del bus (placa o identificador)
    const commentId = comment.id; // ID único del comentario

    // Validamos los identificadores antes de proceder
    if (!busId || busId === 'NaN') {
      console.error(`Invalid busId detected: ${busId}`);
      return;
    }

    if (!commentId) {
      console.error(`Invalid commentId detected: ${commentId}`);
      return;
    }

    // Actualizamos el estado local para reflejar cambios inmediatos en la UI
    comment.status = newStatus;

    // Enviamos la actualización al servicio Firebase
    this.firebaseService
      .updateCommentState(empresaId, busId, commentId, newStatus)
      .then(() => {
        console.log(
          `El comentario ${commentId} del bus ${busId} fue actualizado correctamente a: ${newStatus}.`
        );

        this.applyFilters(); // Reaplicamos los filtros para reflejar los cambios en la lista
        this.calculateStats(); // Recalculamos estadísticas después del cambio
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
}
