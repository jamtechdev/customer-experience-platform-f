import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface ActionPlan {
  id: string;
  title: string;
  description: string;
  category: 'process' | 'product' | 'service' | 'digital' | 'training';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  owner: string;
  department: string;
  startDate: string;
  dueDate: string;
  progress: number;
  budget?: number;
  impact: {
    nps: number;
    satisfaction: number;
    complaints: number;
  };
  tasks: ActionTask[];
  relatedInsights: string[];
  createdAt: string;
  updatedAt: string;
}

interface ActionTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignee: string;
  dueDate: string;
}

@Component({
  selector: 'app-action-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="action-plans-page">
      <div class="page-header">
        <div class="header-left">
          <h1>Aksiyon Planları</h1>
          <p>CX iyileştirme aksiyonlarının takibi ve yönetimi</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Rapor İndir
          </button>
          <button class="btn btn-primary" (click)="showCreateModal = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Yeni Aksiyon Planı
          </button>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ totalPlans() }}</span>
            <span class="stat-label">Toplam Plan</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon progress">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ inProgressPlans() }}</span>
            <span class="stat-label">Devam Eden</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ completedPlans() }}</span>
            <span class="stat-label">Tamamlanan</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon overdue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ overduePlans() }}</span>
            <span class="stat-label">Geciken</span>
          </div>
        </div>
      </div>

      <!-- View Toggle & Filters -->
      <div class="controls-bar">
        <div class="view-toggle">
          <button [class.active]="viewMode === 'kanban'" (click)="viewMode = 'kanban'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="9"/>
              <rect x="14" y="3" width="7" height="5"/>
              <rect x="14" y="12" width="7" height="9"/>
              <rect x="3" y="16" width="7" height="5"/>
            </svg>
            Kanban
          </button>
          <button [class.active]="viewMode === 'list'" (click)="viewMode = 'list'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Liste
          </button>
          <button [class.active]="viewMode === 'timeline'" (click)="viewMode = 'timeline'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="2" x2="12" y2="22"/>
              <circle cx="12" cy="6" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="18" r="2"/>
              <path d="M14 6h7"/>
              <path d="M3 12h7"/>
              <path d="M14 18h7"/>
            </svg>
            Zaman Çizelgesi
          </button>
        </div>
        <div class="filters">
          <select [(ngModel)]="categoryFilter">
            <option value="all">Tüm Kategoriler</option>
            <option value="process">Süreç</option>
            <option value="product">Ürün</option>
            <option value="service">Hizmet</option>
            <option value="digital">Dijital</option>
            <option value="training">Eğitim</option>
          </select>
          <select [(ngModel)]="priorityFilter">
            <option value="all">Tüm Öncelikler</option>
            <option value="critical">Kritik</option>
            <option value="high">Yüksek</option>
            <option value="medium">Orta</option>
            <option value="low">Düşük</option>
          </select>
          <select [(ngModel)]="departmentFilter">
            <option value="all">Tüm Departmanlar</option>
            <option value="IT">Bilgi Teknolojileri</option>
            <option value="Operations">Operasyon</option>
            <option value="Marketing">Pazarlama</option>
            <option value="HR">İnsan Kaynakları</option>
          </select>
        </div>
      </div>

      @if (viewMode === 'kanban') {
        <!-- Kanban View -->
        <div class="kanban-board">
          @for (column of kanbanColumns; track column.status) {
            <div class="kanban-column">
              <div class="column-header">
                <span class="column-title">{{ column.title }}</span>
                <span class="column-count">{{ getColumnPlans(column.status).length }}</span>
              </div>
              <div class="column-content">
                @for (plan of getColumnPlans(column.status); track plan.id) {
                  <div class="plan-card" [class]="plan.priority" (click)="selectPlan(plan)">
                    <div class="card-header">
                      <span class="plan-category" [class]="plan.category">
                        {{ getCategoryIcon(plan.category) }}
                      </span>
                      <span class="plan-priority" [class]="plan.priority">
                        {{ getPriorityText(plan.priority) }}
                      </span>
                    </div>
                    <h4>{{ plan.title }}</h4>
                    <p>{{ plan.description }}</p>
                    <div class="plan-meta">
                      <span class="owner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        {{ plan.owner }}
                      </span>
                      <span class="due-date" [class.overdue]="isOverdue(plan)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {{ plan.dueDate }}
                      </span>
                    </div>
                    @if (plan.progress > 0) {
                      <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="plan.progress"></div>
                        <span class="progress-text">{{ plan.progress }}%</span>
                      </div>
                    }
                    <div class="card-footer">
                      <div class="task-count">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M9 11l3 3L22 4"/>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        {{ getCompletedTasks(plan) }}/{{ plan.tasks.length }}
                      </div>
                      <div class="impact-preview">
                        @if (plan.impact.nps > 0) {
                          <span class="impact-badge positive">+{{ plan.impact.nps }} NPS</span>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else if (viewMode === 'list') {
        <!-- List View -->
        <div class="list-view">
          <table class="plans-table">
            <thead>
              <tr>
                <th>Aksiyon Planı</th>
                <th>Kategori</th>
                <th>Öncelik</th>
                <th>Durum</th>
                <th>Sorumlu</th>
                <th>Bitiş Tarihi</th>
                <th>İlerleme</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              @for (plan of filteredPlans(); track plan.id) {
                <tr [class.overdue]="isOverdue(plan)">
                  <td>
                    <div class="plan-title-cell">
                      <strong>{{ plan.title }}</strong>
                      <span>{{ plan.department }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="category-badge" [class]="plan.category">
                      {{ getCategoryText(plan.category) }}
                    </span>
                  </td>
                  <td>
                    <span class="priority-badge" [class]="plan.priority">
                      {{ getPriorityText(plan.priority) }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" [class]="plan.status">
                      {{ getStatusText(plan.status) }}
                    </span>
                  </td>
                  <td>{{ plan.owner }}</td>
                  <td [class.overdue-text]="isOverdue(plan)">{{ plan.dueDate }}</td>
                  <td>
                    <div class="progress-cell">
                      <div class="progress-bar-small">
                        <div class="progress-fill" [style.width.%]="plan.progress"></div>
                      </div>
                      <span>{{ plan.progress }}%</span>
                    </div>
                  </td>
                  <td>
                    <div class="table-actions">
                      <button class="action-btn" title="Görüntüle" (click)="selectPlan(plan)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      <button class="action-btn" title="Düzenle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <!-- Timeline View -->
        <div class="timeline-view">
          @for (month of timelineMonths(); track month.name) {
            <div class="timeline-month">
              <div class="month-header">
                <h3>{{ month.name }}</h3>
                <span class="month-count">{{ month.plans.length }} aksiyon</span>
              </div>
              <div class="month-plans">
                @for (plan of month.plans; track plan.id) {
                  <div class="timeline-plan" [class]="plan.status" (click)="selectPlan(plan)">
                    <div class="plan-dot" [class]="plan.priority"></div>
                    <div class="plan-content">
                      <div class="plan-header">
                        <h4>{{ plan.title }}</h4>
                        <span class="plan-priority" [class]="plan.priority">
                          {{ getPriorityText(plan.priority) }}
                        </span>
                      </div>
                      <p>{{ plan.description }}</p>
                      <div class="plan-details">
                        <span>{{ plan.department }}</span>
                        <span>{{ plan.owner }}</span>
                        <span>{{ plan.startDate }} - {{ plan.dueDate }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Plan Detail Modal -->
      @if (selectedPlan()) {
        <div class="modal-overlay" (click)="selectedPlan.set(null)">
          <div class="modal-content large" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">
                <span class="category-badge" [class]="selectedPlan()!.category">
                  {{ getCategoryText(selectedPlan()!.category) }}
                </span>
                <h2>{{ selectedPlan()!.title }}</h2>
              </div>
              <button class="close-btn" (click)="selectedPlan.set(null)">×</button>
            </div>
            <div class="modal-body">
              <div class="detail-grid">
                <div class="detail-main">
                  <div class="detail-section">
                    <h3>Açıklama</h3>
                    <p>{{ selectedPlan()!.description }}</p>
                  </div>
                  
                  <div class="detail-section">
                    <h3>Görevler</h3>
                    <div class="tasks-list">
                      @for (task of selectedPlan()!.tasks; track task.id) {
                        <div class="task-item" [class]="task.status">
                          <label class="task-checkbox">
                            <input 
                              type="checkbox" 
                              [checked]="task.status === 'completed'"
                              (change)="toggleTask(task)"
                            >
                            <span class="checkmark"></span>
                          </label>
                          <div class="task-content">
                            <span class="task-title">{{ task.title }}</span>
                            <span class="task-meta">{{ task.assignee }} • {{ task.dueDate }}</span>
                          </div>
                          <span class="task-status" [class]="task.status">
                            {{ getTaskStatusText(task.status) }}
                          </span>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="detail-section">
                    <h3>Beklenen Etki</h3>
                    <div class="impact-grid">
                      <div class="impact-card">
                        <span class="impact-value positive">+{{ selectedPlan()!.impact.nps }}</span>
                        <span class="impact-label">NPS Artışı</span>
                      </div>
                      <div class="impact-card">
                        <span class="impact-value positive">+{{ selectedPlan()!.impact.satisfaction }}%</span>
                        <span class="impact-label">Memnuniyet</span>
                      </div>
                      <div class="impact-card">
                        <span class="impact-value negative">-{{ selectedPlan()!.impact.complaints }}%</span>
                        <span class="impact-label">Şikayet Azalması</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="detail-sidebar">
                  <div class="info-group">
                    <label>Durum</label>
                    <span class="status-badge" [class]="selectedPlan()!.status">
                      {{ getStatusText(selectedPlan()!.status) }}
                    </span>
                  </div>
                  <div class="info-group">
                    <label>Öncelik</label>
                    <span class="priority-badge" [class]="selectedPlan()!.priority">
                      {{ getPriorityText(selectedPlan()!.priority) }}
                    </span>
                  </div>
                  <div class="info-group">
                    <label>Sorumlu</label>
                    <span>{{ selectedPlan()!.owner }}</span>
                  </div>
                  <div class="info-group">
                    <label>Departman</label>
                    <span>{{ selectedPlan()!.department }}</span>
                  </div>
                  <div class="info-group">
                    <label>Başlangıç</label>
                    <span>{{ selectedPlan()!.startDate }}</span>
                  </div>
                  <div class="info-group">
                    <label>Bitiş</label>
                    <span>{{ selectedPlan()!.dueDate }}</span>
                  </div>
                  @if (selectedPlan()!.budget) {
                    <div class="info-group">
                      <label>Bütçe</label>
                      <span>₺{{ selectedPlan()!.budget! | number }}</span>
                    </div>
                  }
                  <div class="info-group">
                    <label>İlerleme</label>
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="selectedPlan()!.progress"></div>
                    </div>
                    <span class="progress-text">{{ selectedPlan()!.progress }}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="selectedPlan.set(null)">Kapat</button>
              <button class="btn btn-primary">Düzenle</button>
            </div>
          </div>
        </div>
      }

      <!-- Create Modal -->
      @if (showCreateModal) {
        <div class="modal-overlay" (click)="showCreateModal = false">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Yeni Aksiyon Planı</h2>
              <button class="close-btn" (click)="showCreateModal = false">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Başlık</label>
                <input type="text" [(ngModel)]="newPlan.title" placeholder="Aksiyon planı başlığı">
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea rows="3" [(ngModel)]="newPlan.description" placeholder="Detaylı açıklama"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Kategori</label>
                  <select [(ngModel)]="newPlan.category">
                    <option value="process">Süreç</option>
                    <option value="product">Ürün</option>
                    <option value="service">Hizmet</option>
                    <option value="digital">Dijital</option>
                    <option value="training">Eğitim</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Öncelik</label>
                  <select [(ngModel)]="newPlan.priority">
                    <option value="critical">Kritik</option>
                    <option value="high">Yüksek</option>
                    <option value="medium">Orta</option>
                    <option value="low">Düşük</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Sorumlu</label>
                  <input type="text" [(ngModel)]="newPlan.owner" placeholder="Ad Soyad">
                </div>
                <div class="form-group">
                  <label>Departman</label>
                  <select [(ngModel)]="newPlan.department">
                    <option value="IT">Bilgi Teknolojileri</option>
                    <option value="Operations">Operasyon</option>
                    <option value="Marketing">Pazarlama</option>
                    <option value="HR">İnsan Kaynakları</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Başlangıç Tarihi</label>
                  <input type="date" [(ngModel)]="newPlan.startDate">
                </div>
                <div class="form-group">
                  <label>Bitiş Tarihi</label>
                  <input type="date" [(ngModel)]="newPlan.dueDate">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="showCreateModal = false">İptal</button>
              <button class="btn btn-primary" (click)="createPlan()">Oluştur</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .action-plans-page {
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header-left h1 {
      font-size: 1.5rem;
      margin-bottom: 4px;
    }

    .header-left p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .btn svg {
      width: 18px;
      height: 18px;
    }

    .btn-primary {
      background: var(--primary-color);
      color: white;
      border: none;
    }

    .btn-outline {
      background: white;
      border: 1px solid var(--border-color);
    }

    /* Stats Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon svg {
      width: 24px;
      height: 24px;
    }

    .stat-icon.total { background: #dbeafe; color: #2563eb; }
    .stat-icon.progress { background: #fef3c7; color: #f59e0b; }
    .stat-icon.completed { background: #dcfce7; color: #22c55e; }
    .stat-icon.overdue { background: #fee2e2; color: #ef4444; }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    /* Controls Bar */
    .controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .view-toggle {
      display: flex;
      gap: 4px;
      padding: 4px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .view-toggle button {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      background: transparent;
      border-radius: 6px;
      font-size: 0.8125rem;
      cursor: pointer;
    }

    .view-toggle button svg {
      width: 16px;
      height: 16px;
    }

    .view-toggle button.active {
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .filters {
      display: flex;
      gap: 12px;
    }

    .filters select {
      padding: 8px 14px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.8125rem;
      background: white;
    }

    /* Kanban Board */
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
      overflow-x: auto;
    }

    .kanban-column {
      background: var(--bg-secondary);
      border-radius: 12px;
      min-width: 280px;
    }

    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .column-title {
      font-weight: 600;
      font-size: 0.875rem;
    }

    .column-count {
      width: 24px;
      height: 24px;
      background: var(--border-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
    }

    .column-content {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 400px;
    }

    .plan-card {
      background: white;
      border-radius: 10px;
      padding: 16px;
      cursor: pointer;
      border-left: 3px solid;
      transition: box-shadow 0.2s ease;
    }

    .plan-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .plan-card.critical { border-color: #ef4444; }
    .plan-card.high { border-color: #f59e0b; }
    .plan-card.medium { border-color: #3b82f6; }
    .plan-card.low { border-color: #22c55e; }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .plan-category {
      font-size: 1rem;
    }

    .plan-priority {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .plan-priority.critical { background: #fee2e2; color: #ef4444; }
    .plan-priority.high { background: #fef3c7; color: #f59e0b; }
    .plan-priority.medium { background: #dbeafe; color: #3b82f6; }
    .plan-priority.low { background: #dcfce7; color: #22c55e; }

    .plan-card h4 {
      font-size: 0.875rem;
      margin-bottom: 6px;
    }

    .plan-card p {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .plan-meta {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }

    .plan-meta span {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }

    .plan-meta svg {
      width: 12px;
      height: 12px;
    }

    .plan-meta .overdue {
      color: #ef4444;
    }

    .progress-bar {
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      margin-bottom: 8px;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background: var(--primary-color);
      border-radius: 3px;
    }

    .progress-text {
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .task-count {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }

    .task-count svg {
      width: 12px;
      height: 12px;
    }

    .impact-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 500;
    }

    .impact-badge.positive {
      background: #dcfce7;
      color: #22c55e;
    }

    /* List View */
    .list-view {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .plans-table {
      width: 100%;
      border-collapse: collapse;
    }

    .plans-table th {
      padding: 16px;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
    }

    .plans-table td {
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .plans-table tr.overdue {
      background: #fef2f2;
    }

    .plan-title-cell {
      display: flex;
      flex-direction: column;
    }

    .plan-title-cell strong {
      font-size: 0.875rem;
    }

    .plan-title-cell span {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .category-badge,
    .priority-badge,
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .category-badge.process { background: #dbeafe; color: #2563eb; }
    .category-badge.product { background: #f3e8ff; color: #9333ea; }
    .category-badge.service { background: #fef3c7; color: #f59e0b; }
    .category-badge.digital { background: #dcfce7; color: #22c55e; }
    .category-badge.training { background: #fee2e2; color: #ef4444; }

    .status-badge.draft { background: #f3f4f6; color: #6b7280; }
    .status-badge.pending_approval { background: #fef3c7; color: #f59e0b; }
    .status-badge.approved { background: #dbeafe; color: #2563eb; }
    .status-badge.in_progress { background: #c7d2fe; color: #4f46e5; }
    .status-badge.completed { background: #dcfce7; color: #22c55e; }
    .status-badge.cancelled { background: #fee2e2; color: #ef4444; }

    .overdue-text {
      color: #ef4444;
      font-weight: 500;
    }

    .progress-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .progress-bar-small {
      width: 80px;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
    }

    .table-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      background: var(--bg-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .action-btn svg {
      width: 16px;
      height: 16px;
      color: var(--text-secondary);
    }

    .action-btn:hover {
      background: var(--border-color);
    }

    /* Timeline View */
    .timeline-view {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .timeline-month {
      position: relative;
    }

    .month-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .month-header h3 {
      font-size: 1rem;
    }

    .month-count {
      padding: 4px 10px;
      background: var(--bg-secondary);
      border-radius: 6px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .month-plans {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-left: 24px;
      border-left: 2px solid var(--border-color);
    }

    .timeline-plan {
      display: flex;
      gap: 16px;
      background: white;
      border-radius: 10px;
      padding: 16px;
      cursor: pointer;
      transition: box-shadow 0.2s ease;
    }

    .timeline-plan:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .plan-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-top: 4px;
      flex-shrink: 0;
    }

    .plan-dot.critical { background: #ef4444; }
    .plan-dot.high { background: #f59e0b; }
    .plan-dot.medium { background: #3b82f6; }
    .plan-dot.low { background: #22c55e; }

    .plan-content {
      flex: 1;
    }

    .plan-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }

    .plan-content h4 {
      font-size: 0.9375rem;
    }

    .plan-content p {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 10px;
    }

    .plan-details {
      display: flex;
      gap: 16px;
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      width: 500px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-content.large {
      width: 800px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .modal-title {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .modal-title h2 {
      font-size: 1.125rem;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: var(--bg-secondary);
      font-size: 1.25rem;
      cursor: pointer;
    }

    .modal-body {
      padding: 24px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 240px;
      gap: 24px;
    }

    .detail-section {
      margin-bottom: 24px;
    }

    .detail-section h3 {
      font-size: 0.875rem;
      margin-bottom: 12px;
      color: var(--text-secondary);
    }

    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .task-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .task-item.completed {
      opacity: 0.6;
    }

    .task-checkbox {
      position: relative;
    }

    .task-checkbox input {
      width: 18px;
      height: 18px;
    }

    .task-content {
      flex: 1;
    }

    .task-title {
      display: block;
      font-size: 0.875rem;
    }

    .task-meta {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .task-status {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.6875rem;
    }

    .task-status.pending { background: #f3f4f6; color: #6b7280; }
    .task-status.in_progress { background: #dbeafe; color: #2563eb; }
    .task-status.completed { background: #dcfce7; color: #22c55e; }

    .impact-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .impact-card {
      text-align: center;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 10px;
    }

    .impact-value {
      display: block;
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .impact-value.positive { color: #22c55e; }
    .impact-value.negative { color: #ef4444; }

    .impact-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .detail-sidebar {
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 12px;
    }

    .info-group {
      margin-bottom: 16px;
    }

    .info-group label {
      display: block;
      font-size: 0.6875rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .info-group span {
      font-size: 0.875rem;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
    }

    @media (max-width: 1200px) {
      .stats-row {
        grid-template-columns: repeat(2, 1fr);
      }

      .kanban-board {
        grid-template-columns: repeat(3, 1fr);
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .page-header, .controls-bar {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .stats-row, .kanban-board {
        grid-template-columns: 1fr;
      }

      .filters {
        flex-wrap: wrap;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ActionPlansComponent {
  viewMode: 'kanban' | 'list' | 'timeline' = 'kanban';
  categoryFilter = 'all';
  priorityFilter = 'all';
  departmentFilter = 'all';
  showCreateModal = false;
  selectedPlan = signal<ActionPlan | null>(null);

  kanbanColumns = [
    { status: 'draft', title: 'Taslak' },
    { status: 'pending_approval', title: 'Onay Bekliyor' },
    { status: 'approved', title: 'Onaylandı' },
    { status: 'in_progress', title: 'Devam Ediyor' },
    { status: 'completed', title: 'Tamamlandı' }
  ];

  newPlan = {
    title: '',
    description: '',
    category: 'process' as const,
    priority: 'medium' as const,
    owner: '',
    department: 'IT',
    startDate: '',
    dueDate: ''
  };

  actionPlans = signal<ActionPlan[]>([
    {
      id: '1',
      title: 'Mobil Uygulama UX İyileştirmesi',
      description: 'Mobil bankacılık uygulamasının kullanıcı deneyiminin iyileştirilmesi ve navigasyonun sadeleştirilmesi',
      category: 'digital',
      priority: 'critical',
      status: 'in_progress',
      owner: 'Ahmet Yılmaz',
      department: 'IT',
      startDate: '2025-01-01',
      dueDate: '2025-03-15',
      progress: 65,
      budget: 250000,
      impact: { nps: 8, satisfaction: 15, complaints: 25 },
      tasks: [
        { id: '1-1', title: 'UX araştırması', status: 'completed', assignee: 'Mehmet K.', dueDate: '2025-01-15' },
        { id: '1-2', title: 'Wireframe tasarımı', status: 'completed', assignee: 'Ayşe B.', dueDate: '2025-01-30' },
        { id: '1-3', title: 'Prototip geliştirme', status: 'in_progress', assignee: 'Ali R.', dueDate: '2025-02-15' },
        { id: '1-4', title: 'Kullanıcı testi', status: 'pending', assignee: 'Zeynep K.', dueDate: '2025-02-28' }
      ],
      relatedInsights: ['insight-1', 'insight-2'],
      createdAt: '2024-12-15',
      updatedAt: '2025-01-18'
    },
    {
      id: '2',
      title: 'Çağrı Merkezi Eğitim Programı',
      description: 'Müşteri temsilcilerine empati ve problem çözme odaklı kapsamlı eğitim verilmesi',
      category: 'training',
      priority: 'high',
      status: 'pending_approval',
      owner: 'Fatma Demir',
      department: 'HR',
      startDate: '2025-02-01',
      dueDate: '2025-04-30',
      progress: 15,
      budget: 75000,
      impact: { nps: 5, satisfaction: 12, complaints: 18 },
      tasks: [
        { id: '2-1', title: 'Eğitim müfredatı hazırlama', status: 'completed', assignee: 'Selin Y.', dueDate: '2025-01-20' },
        { id: '2-2', title: 'Eğitmen seçimi', status: 'in_progress', assignee: 'Murat G.', dueDate: '2025-02-05' },
        { id: '2-3', title: 'Pilot eğitim', status: 'pending', assignee: 'Hakan T.', dueDate: '2025-03-01' }
      ],
      relatedInsights: ['insight-3'],
      createdAt: '2025-01-05',
      updatedAt: '2025-01-17'
    },
    {
      id: '3',
      title: 'Şube Bekleme Süresi Optimizasyonu',
      description: 'Şube içi süreçlerin iyileştirilmesi ve randevu sisteminin devreye alınması',
      category: 'process',
      priority: 'high',
      status: 'approved',
      owner: 'Kemal Öz',
      department: 'Operations',
      startDate: '2025-01-20',
      dueDate: '2025-03-31',
      progress: 25,
      impact: { nps: 6, satisfaction: 10, complaints: 30 },
      tasks: [
        { id: '3-1', title: 'Mevcut süreç analizi', status: 'completed', assignee: 'Deniz A.', dueDate: '2025-01-25' },
        { id: '3-2', title: 'Randevu sistemi geliştirme', status: 'in_progress', assignee: 'Emre K.', dueDate: '2025-02-20' },
        { id: '3-3', title: 'Pilot şube uygulaması', status: 'pending', assignee: 'Gizem S.', dueDate: '2025-03-15' }
      ],
      relatedInsights: ['insight-4'],
      createdAt: '2025-01-10',
      updatedAt: '2025-01-18'
    },
    {
      id: '4',
      title: 'ATM Ağı Genişletme',
      description: 'Müşteri yoğunluğu yüksek bölgelere yeni ATM kurulumu',
      category: 'service',
      priority: 'medium',
      status: 'draft',
      owner: 'Burak Kaya',
      department: 'Operations',
      startDate: '2025-03-01',
      dueDate: '2025-06-30',
      progress: 0,
      budget: 500000,
      impact: { nps: 3, satisfaction: 5, complaints: 10 },
      tasks: [
        { id: '4-1', title: 'Lokasyon analizi', status: 'pending', assignee: 'Cem D.', dueDate: '2025-03-15' },
        { id: '4-2', title: 'Tedarikçi seçimi', status: 'pending', assignee: 'Sibel M.', dueDate: '2025-04-01' }
      ],
      relatedInsights: [],
      createdAt: '2025-01-15',
      updatedAt: '2025-01-15'
    },
    {
      id: '5',
      title: 'Online Kredi Başvuru Sürecini Basitleştirme',
      description: 'Dijital kredi başvuru sürecinin 3 adımdan 1 adıma indirilmesi',
      category: 'digital',
      priority: 'critical',
      status: 'completed',
      owner: 'Zehra Aydın',
      department: 'IT',
      startDate: '2024-10-01',
      dueDate: '2024-12-31',
      progress: 100,
      budget: 180000,
      impact: { nps: 10, satisfaction: 18, complaints: 35 },
      tasks: [
        { id: '5-1', title: 'Süreç tasarımı', status: 'completed', assignee: 'Can B.', dueDate: '2024-10-15' },
        { id: '5-2', title: 'Geliştirme', status: 'completed', assignee: 'Aslı T.', dueDate: '2024-11-30' },
        { id: '5-3', title: 'Test ve yayın', status: 'completed', assignee: 'Oğuz K.', dueDate: '2024-12-20' }
      ],
      relatedInsights: ['insight-5', 'insight-6'],
      createdAt: '2024-09-20',
      updatedAt: '2024-12-31'
    }
  ]);

  totalPlans = computed(() => this.actionPlans().length);
  inProgressPlans = computed(() => this.actionPlans().filter(p => p.status === 'in_progress').length);
  completedPlans = computed(() => this.actionPlans().filter(p => p.status === 'completed').length);
  overduePlans = computed(() => this.actionPlans().filter(p => this.isOverdue(p)).length);

  filteredPlans = computed(() => {
    return this.actionPlans().filter(plan => {
      const matchesCategory = this.categoryFilter === 'all' || plan.category === this.categoryFilter;
      const matchesPriority = this.priorityFilter === 'all' || plan.priority === this.priorityFilter;
      const matchesDepartment = this.departmentFilter === 'all' || plan.department === this.departmentFilter;
      return matchesCategory && matchesPriority && matchesDepartment;
    });
  });

  timelineMonths = computed(() => {
    const plans = this.filteredPlans();
    const months: { name: string; plans: ActionPlan[] }[] = [];
    
    // Group by month
    const grouped: Record<string, ActionPlan[]> = {};
    plans.forEach(plan => {
      const date = new Date(plan.dueDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(plan);
    });
    
    Object.keys(grouped).sort().forEach(key => {
      const [year, month] = key.split('-').map(Number);
      const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                          'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      months.push({
        name: `${monthNames[month]} ${year}`,
        plans: grouped[key]
      });
    });
    
    return months;
  });

  getColumnPlans(status: string): ActionPlan[] {
    return this.filteredPlans().filter(p => p.status === status);
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'process': '⚙️',
      'product': '📦',
      'service': '🎯',
      'digital': '💻',
      'training': '📚'
    };
    return icons[category] || '📋';
  }

  getCategoryText(category: string): string {
    const texts: Record<string, string> = {
      'process': 'Süreç',
      'product': 'Ürün',
      'service': 'Hizmet',
      'digital': 'Dijital',
      'training': 'Eğitim'
    };
    return texts[category] || category;
  }

  getPriorityText(priority: string): string {
    const texts: Record<string, string> = {
      'critical': 'Kritik',
      'high': 'Yüksek',
      'medium': 'Orta',
      'low': 'Düşük'
    };
    return texts[priority] || priority;
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      'draft': 'Taslak',
      'pending_approval': 'Onay Bekliyor',
      'approved': 'Onaylandı',
      'in_progress': 'Devam Ediyor',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal Edildi'
    };
    return texts[status] || status;
  }

  getTaskStatusText(status: string): string {
    const texts: Record<string, string> = {
      'pending': 'Bekliyor',
      'in_progress': 'Devam Ediyor',
      'completed': 'Tamamlandı'
    };
    return texts[status] || status;
  }

  isOverdue(plan: ActionPlan): boolean {
    if (plan.status === 'completed' || plan.status === 'cancelled') return false;
    return new Date(plan.dueDate) < new Date();
  }

  getCompletedTasks(plan: ActionPlan): number {
    return plan.tasks.filter(t => t.status === 'completed').length;
  }

  selectPlan(plan: ActionPlan): void {
    this.selectedPlan.set(plan);
  }

  toggleTask(task: ActionTask): void {
    task.status = task.status === 'completed' ? 'pending' : 'completed';
  }

  createPlan(): void {
    const plan: ActionPlan = {
      id: Date.now().toString(),
      title: this.newPlan.title,
      description: this.newPlan.description,
      category: this.newPlan.category,
      priority: this.newPlan.priority,
      status: 'draft',
      owner: this.newPlan.owner,
      department: this.newPlan.department,
      startDate: this.newPlan.startDate,
      dueDate: this.newPlan.dueDate,
      progress: 0,
      impact: { nps: 0, satisfaction: 0, complaints: 0 },
      tasks: [],
      relatedInsights: [],
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };
    
    this.actionPlans.update(list => [...list, plan]);
    this.showCreateModal = false;
    this.newPlan = {
      title: '',
      description: '',
      category: 'process',
      priority: 'medium',
      owner: '',
      department: 'IT',
      startDate: '',
      dueDate: ''
    };
  }

  constructor(private router: Router) {}
}
