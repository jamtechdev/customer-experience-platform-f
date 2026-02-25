import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService, AlarmService } from '../../core/services';
import { Task, Alarm, TaskStatus, TaskPriority, AlarmSeverity, AlarmStatus } from '../../core/models';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tasks-page">
      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Görevler ve Alarmlar</h1>
          <p class="subtitle">Görev yönetimi ve alarm takibi</p>
        </div>
        <button class="btn btn-primary" (click)="createTask()">
          <i class="icon icon-plus"></i>
          Yeni Görev
        </button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button 
          class="tab" 
          [class.active]="activeTab() === 'tasks'"
          (click)="activeTab.set('tasks')"
        >
          <i class="icon icon-check-square"></i>
          Görevler
          <span class="badge">{{tasks().length}}</span>
        </button>
        <button 
          class="tab" 
          [class.active]="activeTab() === 'alarms'"
          (click)="activeTab.set('alarms')"
        >
          <i class="icon icon-bell"></i>
          Alarmlar
          <span class="badge danger">{{activeAlarms()}}</span>
        </button>
      </div>

      <!-- Tasks View -->
      @if (activeTab() === 'tasks') {
        <!-- Task Stats -->
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-value">{{pendingTasks()}}</span>
            <span class="stat-label">Bekleyen</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{inProgressTasks()}}</span>
            <span class="stat-label">Devam Eden</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{completedTasks()}}</span>
            <span class="stat-label">Tamamlanan</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{overdueTasks()}}</span>
            <span class="stat-label warning">Geciken</span>
          </div>
        </div>

        <!-- Task Filters -->
        <div class="filters-bar">
          <div class="search-box">
            <i class="icon icon-search"></i>
            <input 
              type="text" 
              placeholder="Görev ara..."
              [(ngModel)]="taskSearch"
              (ngModelChange)="filterTasks()"
            >
          </div>
          <div class="filter-group">
            <select [(ngModel)]="taskStatusFilter" (ngModelChange)="filterTasks()">
              <option value="">Tüm Durumlar</option>
              <option value="PENDING">Bekliyor</option>
              <option value="IN_PROGRESS">Devam Ediyor</option>
              <option value="COMPLETED">Tamamlandı</option>
              <option value="CANCELLED">İptal</option>
            </select>
            <select [(ngModel)]="taskPriorityFilter" (ngModelChange)="filterTasks()">
              <option value="">Tüm Öncelikler</option>
              <option value="CRITICAL">Kritik</option>
              <option value="HIGH">Yüksek</option>
              <option value="MEDIUM">Orta</option>
              <option value="LOW">Düşük</option>
            </select>
            <select [(ngModel)]="taskAssigneeFilter" (ngModelChange)="filterTasks()">
              <option value="">Tüm Atananlar</option>
              @for (user of assignees(); track user) {
                <option [value]="user">{{user}}</option>
              }
            </select>
          </div>
          <div class="view-toggle">
            <button 
              [class.active]="taskViewMode() === 'kanban'" 
              (click)="taskViewMode.set('kanban')"
            >
              <i class="icon icon-columns"></i>
            </button>
            <button 
              [class.active]="taskViewMode() === 'list'" 
              (click)="taskViewMode.set('list')"
            >
              <i class="icon icon-list"></i>
            </button>
          </div>
        </div>

        <!-- Kanban View -->
        @if (taskViewMode() === 'kanban') {
          <div class="kanban-board">
            @for (column of kanbanColumns; track column.status) {
              <div class="kanban-column">
                <div class="column-header">
                  <h3>{{column.title}}</h3>
                  <span class="column-count">{{getTasksByStatus(column.status).length}}</span>
                </div>
                <div class="column-body">
                  @for (task of getTasksByStatus(column.status); track task.id) {
                    <div 
                      class="task-card" 
                      [class]="'priority-' + task.priority.toLowerCase()"
                      (click)="selectTask(task)"
                      draggable="true"
                    >
                      <div class="task-header">
                        <span class="priority-dot" [class]="'priority-' + task.priority.toLowerCase()"></span>
                        <span class="task-id">#{{task.id.slice(-6)}}</span>
                      </div>
                      <h4>{{task.title}}</h4>
                      <p class="task-desc">{{task.description}}</p>
                      <div class="task-meta">
                        <span class="assignee">
                          <i class="icon icon-user"></i>
                          {{task.assignee?.name || 'Atanmadı'}}
                        </span>
                        <span class="due-date" [class.overdue]="isOverdue(task)">
                          <i class="icon icon-calendar"></i>
                          {{task.dueDate | date:'shortDate'}}
                        </span>
                      </div>
                      @if (task.relatedFeedbackCount) {
                        <div class="task-feedback-count">
                          <i class="icon icon-message-circle"></i>
                          {{task.relatedFeedbackCount}} geri bildirim
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }

        <!-- List View -->
        @if (taskViewMode() === 'list') {
          <div class="task-list">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Öncelik</th>
                  <th>Görev</th>
                  <th>Atanan</th>
                  <th>Durum</th>
                  <th>Teslim Tarihi</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                @for (task of filteredTasks(); track task.id) {
                  <tr (click)="selectTask(task)">
                    <td>
                      <span class="priority-badge" [class]="'priority-' + task.priority.toLowerCase()">
                        {{getPriorityLabel(task.priority)}}
                      </span>
                    </td>
                    <td>
                      <div class="task-info">
                        <span class="task-title">{{task.title}}</span>
                        <span class="task-id">#{{task.id.slice(-6)}}</span>
                      </div>
                    </td>
                    <td>
                      <div class="assignee-cell">
                        <div class="avatar">{{task.assignee?.name?.charAt(0) || '?'}}</div>
                        <span>{{task.assignee?.name || 'Atanmadı'}}</span>
                      </div>
                    </td>
                    <td>
                      <span class="status-badge" [class]="'status-' + task.status.toLowerCase().replace('_', '-')">
                        {{getStatusLabel(task.status)}}
                      </span>
                    </td>
                    <td [class.overdue]="isOverdue(task)">
                      {{task.dueDate | date:'shortDate'}}
                      @if (isOverdue(task)) {
                        <i class="icon icon-alert-circle warning"></i>
                      }
                    </td>
                    <td>
                      <div class="row-actions">
                        <button class="btn-icon" (click)="editTask(task, $event)">
                          <i class="icon icon-edit"></i>
                        </button>
                        <button class="btn-icon" (click)="deleteTask(task, $event)">
                          <i class="icon icon-trash-2"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }

      <!-- Alarms View -->
      @if (activeTab() === 'alarms') {
        <!-- Alarm Stats -->
        <div class="stats-row">
          <div class="stat-card danger">
            <span class="stat-value">{{criticalAlarms()}}</span>
            <span class="stat-label">Kritik</span>
          </div>
          <div class="stat-card warning">
            <span class="stat-value">{{highAlarms()}}</span>
            <span class="stat-label">Yüksek</span>
          </div>
          <div class="stat-card info">
            <span class="stat-value">{{mediumAlarms()}}</span>
            <span class="stat-label">Orta</span>
          </div>
          <div class="stat-card success">
            <span class="stat-value">{{resolvedAlarms()}}</span>
            <span class="stat-label">Çözüldü</span>
          </div>
        </div>

        <!-- Alarm Filters -->
        <div class="filters-bar">
          <div class="search-box">
            <i class="icon icon-search"></i>
            <input 
              type="text" 
              placeholder="Alarm ara..."
              [(ngModel)]="alarmSearch"
              (ngModelChange)="filterAlarms()"
            >
          </div>
          <div class="filter-group">
            <select [(ngModel)]="alarmSeverityFilter" (ngModelChange)="filterAlarms()">
              <option value="">Tüm Öncelikler</option>
              <option value="CRITICAL">Kritik</option>
              <option value="HIGH">Yüksek</option>
              <option value="MEDIUM">Orta</option>
              <option value="LOW">Düşük</option>
            </select>
            <select [(ngModel)]="alarmStatusFilter" (ngModelChange)="filterAlarms()">
              <option value="">Tüm Durumlar</option>
              <option value="ACTIVE">Aktif</option>
              <option value="ACKNOWLEDGED">Onaylandı</option>
              <option value="RESOLVED">Çözüldü</option>
              <option value="IGNORED">Yoksayıldı</option>
            </select>
          </div>
        </div>

        <!-- Alarm List -->
        <div class="alarm-list">
          @for (alarm of filteredAlarms(); track alarm.id) {
            <div class="alarm-card" [class]="'severity-' + alarm.severity.toLowerCase()">
              <div class="alarm-severity">
                <i class="icon icon-{{getAlarmIcon(alarm.severity)}}"></i>
              </div>
              <div class="alarm-content">
                <div class="alarm-header">
                  <h4>{{alarm.title}}</h4>
                  <span class="alarm-time">{{alarm.triggeredAt | date:'short'}}</span>
                </div>
                <p class="alarm-message">{{alarm.message}}</p>
                <div class="alarm-details">
                  <span class="alarm-type">
                    <i class="icon icon-tag"></i>
                    {{alarm.type}}
                  </span>
                  <span class="alarm-source">
                    <i class="icon icon-map-pin"></i>
                    {{alarm.source || 'Sistem'}}
                  </span>
                  @if (alarm.threshold) {
                    <span class="alarm-threshold">
                      <i class="icon icon-trending-up"></i>
                      Eşik: {{getThresholdDisplay(alarm.threshold)}}
                    </span>
                  }
                </div>
              </div>
              <div class="alarm-actions">
                <span class="alarm-status" [class]="'status-' + alarm.status.toLowerCase()">
                  {{getAlarmStatusLabel(alarm.status)}}
                </span>
                <div class="action-buttons">
                  @if (alarm.status === 'ACTIVE') {
                    <button class="btn btn-sm" (click)="acknowledgeAlarm(alarm)">
                      <i class="icon icon-check"></i>
                      Onayla
                    </button>
                  }
                  <button class="btn btn-sm btn-primary" (click)="createTaskFromAlarm(alarm)">
                    <i class="icon icon-plus"></i>
                    Görev Oluştur
                  </button>
                </div>
              </div>
            </div>
          } @empty {
            <div class="empty-state">
              <i class="icon icon-bell-off"></i>
              <h3>Alarm bulunamadı</h3>
              <p>Filtrelere uygun alarm bulunmuyor</p>
            </div>
          }
        </div>
      }

      <!-- Task Detail Modal -->
      @if (selectedTask()) {
        <div class="modal-overlay" (click)="selectedTask.set(null)">
          <div class="modal task-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title">
                <span class="priority-badge" [class]="'priority-' + selectedTask()!.priority.toLowerCase()">
                  {{getPriorityLabel(selectedTask()!.priority)}}
                </span>
                <h2>{{selectedTask()!.title}}</h2>
              </div>
              <button class="close-btn" (click)="selectedTask.set(null)">
                <i class="icon icon-x"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="task-detail-grid">
                <div class="detail-main">
                  <div class="detail-section">
                    <h4>Açıklama</h4>
                    <p>{{selectedTask()!.description || 'Açıklama yok'}}</p>
                  </div>

                  @if (selectedTask()!.relatedFeedbacks?.length) {
                    <div class="detail-section">
                      <h4>İlişkili Geri Bildirimler</h4>
                      <div class="related-feedbacks">
                        @for (feedback of selectedTask()!.relatedFeedbacks!.slice(0, 5); track feedback) {
                          <div class="feedback-item">
                            <i class="icon icon-message-circle"></i>
                            <span>{{feedback}}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <div class="detail-section">
                    <h4>Aktivite Geçmişi</h4>
                    <div class="activity-timeline">
                      @for (activity of selectedTask()!.activityLog || []; track activity.timestamp) {
                        <div class="activity-item">
                          <div class="activity-dot"></div>
                          <div class="activity-content">
                            <span class="activity-text">{{activity.action}}</span>
                            <span class="activity-meta">
                              {{activity.user}} • {{activity.timestamp | date:'short'}}
                            </span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <div class="detail-sidebar">
                  <div class="sidebar-item">
                    <label>Durum</label>
                    <select [(ngModel)]="selectedTask()!.status" (ngModelChange)="updateTaskStatus($event)">
                      <option value="PENDING">Bekliyor</option>
                      <option value="IN_PROGRESS">Devam Ediyor</option>
                      <option value="COMPLETED">Tamamlandı</option>
                      <option value="CANCELLED">İptal</option>
                    </select>
                  </div>
                  <div class="sidebar-item">
                    <label>Atanan</label>
                    <div class="assignee-info">
                      <div class="avatar large">
                        {{selectedTask()!.assignee?.name?.charAt(0) || '?'}}
                      </div>
                      <span>{{selectedTask()!.assignee?.name || 'Atanmadı'}}</span>
                    </div>
                  </div>
                  <div class="sidebar-item">
                    <label>Teslim Tarihi</label>
                    <span [class.overdue]="isOverdue(selectedTask()!)">
                      {{selectedTask()!.dueDate | date:'fullDate'}}
                    </span>
                  </div>
                  <div class="sidebar-item">
                    <label>Oluşturulma</label>
                    <span>{{selectedTask()!.createdAt | date:'short'}}</span>
                  </div>
                  <div class="sidebar-item">
                    <label>Kategori</label>
                    <span>{{selectedTask()!.category || 'Genel'}}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="selectedTask.set(null)">Kapat</button>
              <button class="btn btn-primary" (click)="saveTask()">Kaydet</button>
            </div>
          </div>
        </div>
      }

      <!-- Create Task Modal -->
      @if (showCreateModal()) {
        <div class="modal-overlay" (click)="showCreateModal.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Yeni Görev Oluştur</h2>
              <button class="close-btn" (click)="showCreateModal.set(false)">
                <i class="icon icon-x"></i>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Görev Başlığı *</label>
                <input type="text" [(ngModel)]="newTask.title" placeholder="Görev başlığını girin">
              </div>
              <div class="form-group">
                <label>Açıklama</label>
                <textarea [(ngModel)]="newTask.description" placeholder="Görev açıklaması..." rows="3"></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Öncelik</label>
                  <select [(ngModel)]="newTask.priority">
                    <option value="LOW">Düşük</option>
                    <option value="MEDIUM">Orta</option>
                    <option value="HIGH">Yüksek</option>
                    <option value="CRITICAL">Kritik</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Teslim Tarihi</label>
                  <input type="date" [(ngModel)]="newTask.dueDate">
                </div>
              </div>
              <div class="form-group">
                <label>Atanan Kişi</label>
                <select [(ngModel)]="newTask.assigneeId">
                  <option value="">Seçiniz</option>
                  @for (user of assignees(); track user) {
                    <option [value]="user">{{user}}</option>
                  }
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="showCreateModal.set(false)">İptal</button>
              <button class="btn btn-primary" (click)="saveNewTask()">Oluştur</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .tasks-page {
      padding: 1.5rem;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1.5rem;

      h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
      .subtitle { margin: 0.25rem 0 0; color: var(--text-secondary, #6b7280); font-size: 0.875rem; }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;

      &.btn-primary { background: var(--primary-color, #3b82f6); color: #fff; &:hover { background: #2563eb; } }
      &.btn-secondary { background: #fff; border: 1px solid var(--border-color, #e5e7eb); color: var(--text-primary, #1f2937); &:hover { background: var(--hover-bg, #f3f4f6); } }
      &.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8125rem; }
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    }

    .tab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary, #6b7280);
      cursor: pointer;
      transition: all 0.2s;

      &:hover { color: var(--text-primary, #1f2937); }
      &.active { color: var(--primary-color, #3b82f6); border-bottom-color: var(--primary-color, #3b82f6); }

      .badge {
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        background: var(--bg-secondary, #f3f4f6);

        &.danger { background: #fee2e2; color: #b91c1c; }
      }
    }

    /* Stats Row */
    .stats-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      flex: 1;
      background: #fff;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      text-align: center;

      .stat-value { display: block; font-size: 1.75rem; font-weight: 700; line-height: 1.2; }
      .stat-label { font-size: 0.8125rem; color: var(--text-secondary, #6b7280); &.warning { color: #d97706; } }

      &.danger .stat-value { color: #dc2626; }
      &.warning .stat-value { color: #d97706; }
      &.info .stat-value { color: #3b82f6; }
      &.success .stat-value { color: #059669; }
    }

    /* Filters */
    .filters-bar {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #fff;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .search-box {
      position: relative;
      flex: 1;
      max-width: 300px;

      .icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary, #9ca3af); }
      input { width: 100%; padding: 0.5rem 0.75rem 0.5rem 2.25rem; border: 1px solid var(--border-color, #e5e7eb); border-radius: 0.375rem; font-size: 0.875rem; &:focus { outline: none; border-color: var(--primary-color, #3b82f6); } }
    }

    .filter-group {
      display: flex;
      gap: 0.75rem;

      select {
        padding: 0.5rem 2rem 0.5rem 0.75rem;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 0.375rem;
        font-size: 0.875rem;
        background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E") right 0.5rem center no-repeat;
        background-size: 16px;
        cursor: pointer;
      }
    }

    .view-toggle {
      display: flex;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 0.375rem;
      margin-left: auto;

      button {
        padding: 0.5rem 0.75rem;
        background: #fff;
        border: none;
        cursor: pointer;
        &:not(:last-child) { border-right: 1px solid var(--border-color, #e5e7eb); }
        &.active { background: var(--primary-color, #3b82f6); color: #fff; }
      }
    }

    /* Kanban Board */
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .kanban-column {
      background: var(--bg-secondary, #f9fafb);
      border-radius: 0.5rem;
      min-height: 500px;
    }

    .column-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      h3 { margin: 0; font-size: 0.875rem; font-weight: 600; }
      .column-count { padding: 0.125rem 0.5rem; background: var(--border-color, #e5e7eb); border-radius: 9999px; font-size: 0.75rem; }
    }

    .column-body {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .task-card {
      background: #fff;
      border-radius: 0.5rem;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s;
      border-left: 3px solid transparent;

      &:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
      &.priority-critical { border-left-color: #dc2626; }
      &.priority-high { border-left-color: #f59e0b; }
      &.priority-medium { border-left-color: #3b82f6; }
      &.priority-low { border-left-color: #10b981; }
    }

    .task-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .priority-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &.priority-critical { background: #dc2626; }
      &.priority-high { background: #f59e0b; }
      &.priority-medium { background: #3b82f6; }
      &.priority-low { background: #10b981; }
    }

    .task-id {
      font-size: 0.75rem;
      color: var(--text-secondary, #9ca3af);
    }

    .task-card h4 {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .task-desc {
      margin: 0 0 0.75rem;
      font-size: 0.8125rem;
      color: var(--text-secondary, #6b7280);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .task-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-secondary, #9ca3af);

      span { display: flex; align-items: center; gap: 0.25rem; }
      .overdue { color: #dc2626; }
    }

    .task-feedback-count {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-color, #e5e7eb);
      font-size: 0.75rem;
      color: var(--text-secondary, #6b7280);
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    /* List View */
    .task-list {
      background: #fff;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;

      th, td { padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid var(--border-color, #e5e7eb); }
      th { background: var(--bg-secondary, #f9fafb); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--text-secondary, #6b7280); }
      tr { cursor: pointer; transition: background 0.2s; &:hover { background: var(--hover-bg, #f9fafb); } }
    }

    .priority-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.6875rem;
      font-weight: 600;

      &.priority-critical { background: #fee2e2; color: #b91c1c; }
      &.priority-high { background: #fef3c7; color: #b45309; }
      &.priority-medium { background: #dbeafe; color: #2563eb; }
      &.priority-low { background: #d1fae5; color: #047857; }
    }

    .task-info {
      display: flex;
      flex-direction: column;
      .task-title { font-weight: 500; }
      .task-id { font-size: 0.75rem; color: var(--text-secondary, #9ca3af); }
    }

    .assignee-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--primary-color, #3b82f6);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 500;

      &.large { width: 36px; height: 36px; font-size: 0.875rem; }
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 500;

      &.status-pending { background: #f3f4f6; color: #6b7280; }
      &.status-in-progress { background: #dbeafe; color: #2563eb; }
      &.status-completed { background: #d1fae5; color: #059669; }
      &.status-cancelled { background: #fee2e2; color: #b91c1c; }
    }

    .overdue { color: #dc2626; }
    .warning { color: #d97706; }

    .row-actions {
      display: flex;
      gap: 0.25rem;
    }

    .btn-icon {
      padding: 0.375rem;
      background: none;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      color: var(--text-secondary, #6b7280);
      &:hover { background: var(--hover-bg, #f3f4f6); color: var(--text-primary, #1f2937); }
    }

    /* Alarm List */
    .alarm-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .alarm-card {
      display: flex;
      gap: 1rem;
      background: #fff;
      padding: 1rem 1.25rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-left: 4px solid;

      &.severity-critical { border-left-color: #dc2626; }
      &.severity-high { border-left-color: #f59e0b; }
      &.severity-medium { border-left-color: #3b82f6; }
      &.severity-low { border-left-color: #10b981; }
    }

    .alarm-severity {
      width: 40px;
      height: 40px;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .severity-critical & { background: #fee2e2; color: #dc2626; }
      .severity-high & { background: #fef3c7; color: #d97706; }
      .severity-medium & { background: #dbeafe; color: #3b82f6; }
      .severity-low & { background: #d1fae5; color: #059669; }
    }

    .alarm-content {
      flex: 1;
    }

    .alarm-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 0.375rem;

      h4 { margin: 0; font-size: 0.9375rem; font-weight: 500; }
      .alarm-time { font-size: 0.75rem; color: var(--text-secondary, #9ca3af); }
    }

    .alarm-message {
      margin: 0 0 0.5rem;
      font-size: 0.8125rem;
      color: var(--text-secondary, #6b7280);
    }

    .alarm-details {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: var(--text-secondary, #9ca3af);

      span { display: flex; align-items: center; gap: 0.25rem; }
    }

    .alarm-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.5rem;
    }

    .alarm-status {
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.6875rem;
      font-weight: 500;

      &.status-active { background: #fee2e2; color: #b91c1c; }
      &.status-acknowledged { background: #fef3c7; color: #b45309; }
      &.status-resolved { background: #d1fae5; color: #059669; }
      &.status-ignored { background: #f3f4f6; color: #6b7280; }
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: #fff;
      border-radius: 0.5rem;

      .icon { width: 48px; height: 48px; color: var(--text-secondary, #9ca3af); opacity: 0.5; margin-bottom: 1rem; }
      h3 { margin: 0 0 0.5rem; }
      p { margin: 0; color: var(--text-secondary, #6b7280); }
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: #fff;
      border-radius: 0.75rem;
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      overflow: hidden;

      &.task-modal { max-width: 800px; }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);

      h2 { margin: 0; font-size: 1.125rem; }
    }

    .modal-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .close-btn {
      padding: 0.5rem;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 0.375rem;
      &:hover { background: var(--hover-bg, #f3f4f6); }
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      max-height: calc(90vh - 130px);
    }

    .task-detail-grid {
      display: grid;
      grid-template-columns: 1fr 240px;
      gap: 1.5rem;
    }

    .detail-section {
      margin-bottom: 1.5rem;

      h4 { margin: 0 0 0.75rem; font-size: 0.875rem; font-weight: 600; }
      p { margin: 0; font-size: 0.875rem; color: var(--text-secondary, #6b7280); line-height: 1.6; }
    }

    .related-feedbacks {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .feedback-item {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem;
      background: var(--bg-secondary, #f9fafb);
      border-radius: 0.375rem;
      font-size: 0.8125rem;
    }

    .activity-timeline {
      position: relative;
      padding-left: 1.5rem;
    }

    .activity-item {
      position: relative;
      padding-bottom: 1rem;
      border-left: 2px solid var(--border-color, #e5e7eb);
      padding-left: 1rem;
      margin-left: -1.5rem;

      &:last-child { border-left-color: transparent; }
    }

    .activity-dot {
      position: absolute;
      left: -7px;
      top: 0;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--primary-color, #3b82f6);
      border: 2px solid #fff;
    }

    .activity-content {
      .activity-text { display: block; font-size: 0.875rem; }
      .activity-meta { font-size: 0.75rem; color: var(--text-secondary, #9ca3af); }
    }

    .detail-sidebar {
      background: var(--bg-secondary, #f9fafb);
      padding: 1rem;
      border-radius: 0.5rem;
    }

    .sidebar-item {
      margin-bottom: 1rem;

      &:last-child { margin-bottom: 0; }

      label { display: block; font-size: 0.75rem; color: var(--text-secondary, #6b7280); margin-bottom: 0.375rem; }
      span { font-size: 0.875rem; }
      select { width: 100%; padding: 0.5rem; border: 1px solid var(--border-color, #e5e7eb); border-radius: 0.375rem; }
    }

    .assignee-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .form-group {
      margin-bottom: 1rem;

      label { display: block; margin-bottom: 0.375rem; font-size: 0.875rem; font-weight: 500; }
      input, select, textarea { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid var(--border-color, #e5e7eb); border-radius: 0.5rem; font-size: 0.875rem; &:focus { outline: none; border-color: var(--primary-color, #3b82f6); } }
      textarea { resize: vertical; }
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color, #e5e7eb);
    }

    .icon { width: 18px; height: 18px; }

    @media (max-width: 1024px) {
      .kanban-board { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .kanban-board { grid-template-columns: 1fr; }
      .stats-row { flex-wrap: wrap; }
      .stat-card { min-width: calc(50% - 0.5rem); }
      .filters-bar { flex-direction: column; align-items: stretch; }
      .search-box { max-width: none; }
      .filter-group { flex-wrap: wrap; select { flex: 1; min-width: calc(50% - 0.375rem); } }
      .task-detail-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class TaskListComponent implements OnInit {
  private taskService = inject(TaskService);
  private alarmService = inject(AlarmService);

  activeTab = signal<'tasks' | 'alarms'>('tasks');
  taskViewMode = signal<'kanban' | 'list'>('kanban');

  tasks = signal<Task[]>([]);
  filteredTasks = signal<Task[]>([]);
  alarms = signal<Alarm[]>([]);
  filteredAlarms = signal<Alarm[]>([]);
  
  selectedTask = signal<Task | null>(null);
  showCreateModal = signal(false);

  taskSearch = '';
  taskStatusFilter = '';
  taskPriorityFilter = '';
  taskAssigneeFilter = '';

  alarmSearch = '';
  alarmSeverityFilter = '';
  alarmStatusFilter = '';

  assignees = signal<string[]>(['Ahmet Yılmaz', 'Mehmet Demir', 'Ayşe Kaya', 'Fatma Öz']);

  newTask = {
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    assigneeId: ''
  };

  kanbanColumns = [
    { status: TaskStatus.PENDING, title: 'Bekliyor' },
    { status: TaskStatus.IN_PROGRESS, title: 'Devam Ediyor' },
    { status: TaskStatus.COMPLETED, title: 'Tamamlandı' },
    { status: TaskStatus.CANCELLED, title: 'İptal' }
  ];

  pendingTasks = signal(0);
  inProgressTasks = signal(0);
  completedTasks = signal(0);
  overdueTasks = signal(0);

  activeAlarms = signal(0);
  criticalAlarms = signal(0);
  highAlarms = signal(0);
  mediumAlarms = signal(0);
  resolvedAlarms = signal(0);

  ngOnInit(): void {
    this.loadTasks();
    this.loadAlarms();
  }

  loadTasks(): void {
    this.taskService.getTasks({}, { page: 1, pageSize: 100 }).subscribe((response: any) => {
      if (response.success) {
        this.tasks.set(response.data);
        this.filterTasks();
        this.calculateTaskStats();
      }
    });
  }

  loadAlarms(): void {
    this.alarmService.getAlarms({}, { page: 1, pageSize: 100 }).subscribe((response: any) => {
      if (response.success) {
        this.alarms.set(response.data);
        this.filterAlarms();
        this.calculateAlarmStats();
      }
    });
  }

  filterTasks(): void {
    let result = [...this.tasks()];

    if (this.taskSearch) {
      const term = this.taskSearch.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
      );
    }

    if (this.taskStatusFilter) {
      result = result.filter(t => t.status === this.taskStatusFilter);
    }

    if (this.taskPriorityFilter) {
      result = result.filter(t => t.priority === this.taskPriorityFilter);
    }

    if (this.taskAssigneeFilter) {
      result = result.filter(t => t.assignedTo === this.taskAssigneeFilter);
    }

    this.filteredTasks.set(result);
  }

  filterAlarms(): void {
    let result = [...this.alarms()];

    if (this.alarmSearch) {
      const term = this.alarmSearch.toLowerCase();
      result = result.filter(a => 
        a.title.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term)
      );
    }

    if (this.alarmSeverityFilter) {
      result = result.filter(a => a.severity === this.alarmSeverityFilter);
    }

    if (this.alarmStatusFilter) {
      result = result.filter(a => a.status === this.alarmStatusFilter);
    }

    this.filteredAlarms.set(result);
  }

  calculateTaskStats(): void {
    const tasks = this.tasks();
    this.pendingTasks.set(tasks.filter(t => t.status === TaskStatus.PENDING).length);
    this.inProgressTasks.set(tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length);
    this.completedTasks.set(tasks.filter(t => t.status === TaskStatus.COMPLETED).length);
    this.overdueTasks.set(tasks.filter(t => this.isOverdue(t)).length);
  }

  calculateAlarmStats(): void {
    const alarms = this.alarms();
    this.activeAlarms.set(alarms.filter(a => a.status === AlarmStatus.ACTIVE).length);
    this.criticalAlarms.set(alarms.filter(a => a.severity === AlarmSeverity.CRITICAL).length);
    this.highAlarms.set(alarms.filter(a => a.severity === AlarmSeverity.HIGH).length);
    this.mediumAlarms.set(alarms.filter(a => a.severity === AlarmSeverity.MEDIUM).length);
    this.resolvedAlarms.set(alarms.filter(a => a.status === AlarmStatus.RESOLVED).length);
  }

  getTasksByStatus(status: TaskStatus): Task[] {
    return this.filteredTasks().filter(t => t.status === status);
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === TaskStatus.COMPLETED) return false;
    return new Date(task.dueDate) < new Date();
  }

  selectTask(task: Task): void {
    this.selectedTask.set(task);
  }

  createTask(): void {
    this.newTask = {
      title: '',
      description: '',
      priority: 'MEDIUM',
      dueDate: '',
      assigneeId: ''
    };
    this.showCreateModal.set(true);
  }

  editTask(task: Task, event: Event): void {
    event.stopPropagation();
    this.selectTask(task);
  }

  deleteTask(task: Task, event: Event): void {
    event.stopPropagation();
    if (confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
      this.taskService.deleteTask(task.id).subscribe(() => {
        this.loadTasks();
      });
    }
  }

  saveNewTask(): void {
    this.taskService.createTask(this.newTask as any).subscribe(response => {
      if (response.success) {
        this.showCreateModal.set(false);
        this.loadTasks();
      }
    });
  }

  saveTask(): void {
    const task = this.selectedTask();
    if (task) {
      this.taskService.updateTask(task.id, task).subscribe(() => {
        this.selectedTask.set(null);
        this.loadTasks();
      });
    }
  }

  updateTaskStatus(status: TaskStatus): void {
    const task = this.selectedTask();
    if (task) {
      this.taskService.updateTaskStatus(task.id, status).subscribe(() => {
        this.loadTasks();
      });
    }
  }

  acknowledgeAlarm(alarm: Alarm): void {
    this.alarmService.acknowledgeAlarm(alarm.id).subscribe(() => {
      this.loadAlarms();
    });
  }

  getThresholdDisplay(threshold: number | { value: number; unit: string }): string {
    if (typeof threshold === 'number') {
      return threshold.toString();
    }
    return `${threshold.value}${threshold.unit}`;
  }

  createTaskFromAlarm(alarm: Alarm): void {
    const taskData = {
      title: `Alarm: ${alarm.title}`,
      description: alarm.description,
      priority: alarm.severity === AlarmSeverity.CRITICAL ? TaskPriority.URGENT : 
                alarm.severity === AlarmSeverity.HIGH ? TaskPriority.HIGH : TaskPriority.MEDIUM,
      relatedFeedbackIds: alarm.relatedFeedbackIds || []
    };
    this.alarmService.createTaskFromAlarm(alarm.id, taskData as any).subscribe((response: any) => {
      if (response.success) {
        this.activeTab.set('tasks');
        this.loadTasks();
      }
    });
  }

  getPriorityLabel(priority: TaskPriority): string {
    const labels: Record<TaskPriority, string> = {
      [TaskPriority.URGENT]: 'Acil',
      [TaskPriority.HIGH]: 'Yüksek',
      [TaskPriority.MEDIUM]: 'Orta',
      [TaskPriority.LOW]: 'Düşük'
    };
    return labels[priority] || priority;
  }

  getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      [TaskStatus.PENDING]: 'Bekliyor',
      [TaskStatus.IN_PROGRESS]: 'Devam Ediyor',
      [TaskStatus.PENDING_APPROVAL]: 'Onay Bekliyor',
      [TaskStatus.APPROVED]: 'Onaylandı',
      [TaskStatus.REJECTED]: 'Reddedildi',
      [TaskStatus.COMPLETED]: 'Tamamlandı',
      [TaskStatus.CANCELLED]: 'İptal'
    };
    return labels[status] || status;
  }

  getAlarmIcon(severity: AlarmSeverity): string {
    const icons: Record<AlarmSeverity, string> = {
      [AlarmSeverity.CRITICAL]: 'alert-octagon',
      [AlarmSeverity.HIGH]: 'alert-triangle',
      [AlarmSeverity.MEDIUM]: 'alert-circle',
      [AlarmSeverity.LOW]: 'info',
      [AlarmSeverity.INFO]: 'info'
    };
    return icons[severity] || 'bell';
  }

  getAlarmStatusLabel(status: AlarmStatus): string {
    const labels: Record<AlarmStatus, string> = {
      [AlarmStatus.ACTIVE]: 'Aktif',
      [AlarmStatus.ACKNOWLEDGED]: 'Onaylandı',
      [AlarmStatus.IN_PROGRESS]: 'Devam Ediyor',
      [AlarmStatus.RESOLVED]: 'Çözüldü',
      [AlarmStatus.DISMISSED]: 'Yoksayıldı'
    };
    return labels[status] || status;
  }
}
