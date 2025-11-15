import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Comment {
  id: number;
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
export class Comments implements OnInit {
  comments: Comment[] = [];
  filteredComments: Comment[] = [];
  paginatedComments: Comment[] = [];
  selectedCategory: string = 'todas';
  selectedStatus: string = 'todos';
  selectedRating: string = 'todas';
  searchTerm: string = '';
  viewMode: 'detailed' | 'compact' = (localStorage.getItem('commentsViewMode') as 'detailed' | 'compact') || 'detailed';
  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 0;
  
  Math = Math;
  
  // Estadísticas
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

  ngOnInit(): void {
    this.loadMockComments();
    this.applyFilters();
    this.calculateStats();
  }

  loadMockComments(): void {
    // Datos de ejemplo para demostración
    this.comments = [
      {
        id: 1,
        busPlaca: 'ABC-123',
        userRole: 'Pasajero Regular',
        content: 'Excelente servicio, el conductor muy amable y el bus llegó puntual. La ruta fue cómoda y sin contratiempos.',
        rating: 5,
        date: new Date('2025-11-14T08:30:00'),
        category: 'servicio',
        status: 'resuelto',
      },
      {
        id: 2,
        busPlaca: 'XYZ-456',
        userRole: 'Pasajero',
        content: 'El bus estaba muy limpio, pero el aire acondicionado no funcionaba correctamente. Hace mucho calor.',
        rating: 3,
        date: new Date('2025-11-14T09:15:00'),
        category: 'vehiculo',
        status: 'revisado',
      },
      {
        id: 3,
        busPlaca: 'DEF-789',
        userRole: 'Pasajero Frecuente',
        content: 'El conductor maneja muy rápido y de forma imprudente. Me sentí insegura durante todo el trayecto.',
        rating: 2,
        date: new Date('2025-11-13T14:20:00'),
        category: 'conductor',
        status: 'pendiente',
      },
      {
        id: 4,
        busPlaca: 'ABC-123',
        userRole: 'Pasajero',
        content: 'Todo perfecto, llegué a tiempo a mi destino. El conductor muy profesional.',
        rating: 5,
        date: new Date('2025-11-13T07:45:00'),
        category: 'puntualidad',
        status: 'resuelto',
      },
      {
        id: 5,
        busPlaca: 'GHI-321',
        userRole: 'Pasajero Regular',
        content: 'El bus se retrasó 20 minutos sin previo aviso. Llegué tarde a mi trabajo.',
        rating: 2,
        date: new Date('2025-11-12T06:30:00'),
        category: 'puntualidad',
        status: 'revisado',
      },
      {
        id: 6,
        busPlaca: 'JKL-654',
        userRole: 'Pasajero',
        content: 'Me gustaría que hubiera más información en tiempo real sobre el paradero del bus.',
        rating: 4,
        date: new Date('2025-11-12T16:00:00'),
        category: 'otro',
        status: 'pendiente',
      },
    ];
  }

  calculateStats(): void {
    this.stats.total = this.comments.length;
    this.stats.pendientes = this.comments.filter(c => c.status === 'pendiente').length;
    this.stats.revisados = this.comments.filter(c => c.status === 'revisado').length;
    this.stats.resueltos = this.comments.filter(c => c.status === 'resuelto').length;
    
    const totalRatings = this.comments.reduce((sum, c) => sum + c.rating, 0);
    this.stats.promedioRating = this.comments.length > 0 
      ? Math.round((totalRatings / this.comments.length) * 10) / 10 
      : 0;
  }

  setViewMode(mode: 'detailed' | 'compact'): void {
    this.viewMode = mode;
    localStorage.setItem('commentsViewMode', mode);
  }

  applyFilters(): void {
    this.filteredComments = this.comments.filter(comment => {
      const matchesCategory = this.selectedCategory === 'todas' || comment.category === this.selectedCategory;
      const matchesStatus = this.selectedStatus === 'todos' || comment.status === this.selectedStatus;
      const matchesRating = this.selectedRating === 'todas' || comment.rating === parseInt(this.selectedRating);
      const matchesSearch = !this.searchTerm || 
        comment.busPlaca.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        comment.content.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchesCategory && matchesStatus && matchesRating && matchesSearch;
    });
    
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredComments.length / this.pageSize);
    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages - 1;
    }
    const start = this.currentPage * this.pageSize;
    this.paginatedComments = this.filteredComments.slice(start, start + this.pageSize);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.updatePagination();
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.applyFilters();
  }

  onStatusChange(status: string): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  onRatingChange(rating: string): void {
    this.selectedRating = rating;
    this.applyFilters();
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyFilters();
  }

  changeCommentStatus(comment: Comment, newStatus: 'pendiente' | 'revisado' | 'resuelto'): void {
    comment.status = newStatus;
    this.calculateStats();
    this.applyFilters();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'revisado': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resuelto': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  }

  getRatingStars(rating: number): string[] {
    return Array(5).fill('').map((_, i) => i < rating ? '★' : '☆');
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  }

  getUserInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
