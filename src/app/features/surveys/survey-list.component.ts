import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Survey {
  id: string;
  title: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  type: 'NPS' | 'CSAT' | 'CES' | 'CUSTOM';
  responseCount: number;
  targetCount: number;
  averageScore: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  createdBy: string;
}

@Component({
  selector: 'app-survey-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="survey-list">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>Anketler</h1>
          <p>Müşteri memnuniyet anketlerini yönetin</p>
        </div>
        <a routerLink="/surveys/builder" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Yeni Anket
        </a>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11H3v10h6V11z"/>
              <path d="M21 3h-6v18h6V3z"/>
              <path d="M15 7H9v14h6V7z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ surveys().length }}</span>
            <span class="stat-label">Toplam Anket</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ activeCount() }}</span>
            <span class="stat-label">Aktif</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon responses">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ totalResponses() | number }}</span>
            <span class="stat-label">Toplam Yanıt</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon score">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-value">{{ averageScore() | number:'1.1-1' }}</span>
            <span class="stat-label">Ortalama Skor</span>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            type="text" 
            placeholder="Anket ara..."
            [(ngModel)]="searchQuery"
            (input)="filterSurveys()"
          />
        </div>

        <select [(ngModel)]="filterType" (change)="filterSurveys()">
          <option value="">Tüm Tipler</option>
          <option value="NPS">NPS</option>
          <option value="CSAT">CSAT</option>
          <option value="CES">CES</option>
          <option value="CUSTOM">Özel</option>
        </select>

        <select [(ngModel)]="filterStatus" (change)="filterSurveys()">
          <option value="">Tüm Durumlar</option>
          <option value="ACTIVE">Aktif</option>
          <option value="DRAFT">Taslak</option>
          <option value="PAUSED">Duraklatıldı</option>
          <option value="COMPLETED">Tamamlandı</option>
        </select>
      </div>

      <!-- Surveys Grid -->
      <div class="surveys-grid">
        @for (survey of filteredSurveys(); track survey.id) {
          <div class="survey-card" [class]="survey.status.toLowerCase()">
            <div class="survey-header">
              <span class="type-badge" [class]="survey.type.toLowerCase()">{{ survey.type }}</span>
              <span class="status-badge" [class]="survey.status.toLowerCase()">
                {{ getStatusLabel(survey.status) }}
              </span>
            </div>

            <h3 class="survey-title">{{ survey.title }}</h3>
            <p class="survey-desc">{{ survey.description }}</p>

            <div class="survey-progress">
              <div class="progress-header">
                <span>{{ survey.responseCount }} / {{ survey.targetCount }} Yanıt</span>
                <span>{{ getProgressPercent(survey) }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="getProgressPercent(survey)"></div>
              </div>
            </div>

            <div class="survey-score">
              <div class="score-circle" [class]="getScoreClass(survey.averageScore, survey.type)">
                <span class="score-value">{{ survey.averageScore | number:'1.1-1' }}</span>
              </div>
              <div class="score-info">
                <span class="score-label">Ortalama Skor</span>
                <span class="score-status" [class]="getScoreClass(survey.averageScore, survey.type)">
                  {{ getScoreStatus(survey.averageScore, survey.type) }}
                </span>
              </div>
            </div>

            <div class="survey-dates">
              @if (survey.startDate) {
                <span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  {{ formatDate(survey.startDate) }}
                </span>
              }
              @if (survey.endDate) {
                <span>→ {{ formatDate(survey.endDate) }}</span>
              }
            </div>

            <div class="survey-actions">
              <a [routerLink]="['/surveys/results', survey.id]" class="action-btn" title="Sonuçlar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
              </a>
              <a [routerLink]="['/surveys/builder', survey.id]" class="action-btn" title="Düzenle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </a>
              @if (survey.status === 'ACTIVE') {
                <button class="action-btn" (click)="pauseSurvey(survey)" title="Duraklat">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="4" width="4" height="16"/>
                    <rect x="14" y="4" width="4" height="16"/>
                  </svg>
                </button>
              } @else if (survey.status === 'DRAFT' || survey.status === 'PAUSED') {
                <button class="action-btn" (click)="activateSurvey(survey)" title="Aktifleştir">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </button>
              }
              <button class="action-btn" (click)="copySurveyLink(survey)" title="Link Kopyala">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </button>
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11H3v10h6V11z"/>
              <path d="M21 3h-6v18h6V3z"/>
              <path d="M15 7H9v14h6V7z"/>
            </svg>
            <h3>Anket Bulunamadı</h3>
            <p>Henüz bir anket oluşturulmamış veya filtrelere uygun anket yok.</p>
            <a routerLink="/surveys/builder" class="btn btn-primary">İlk Anketi Oluştur</a>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .survey-list {
      padding: 0;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }

    .header-content h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .header-content p {
      color: var(--text-secondary);
      font-size: 0.875rem;
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
      transition: all 0.2s ease;
      text-decoration: none;
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

    .btn-primary:hover {
      background: var(--primary-dark);
    }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
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

    .stat-icon.total { background: #e3f2fd; color: #1976d2; }
    .stat-icon.active { background: #e8f5e9; color: #388e3c; }
    .stat-icon.responses { background: #f3e5f5; color: #7b1fa2; }
    .stat-icon.score { background: #fff3e0; color: #f57c00; }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Filters */
    .filters-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .search-box {
      flex: 1;
      min-width: 250px;
      position: relative;
    }

    .search-box svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      color: var(--text-tertiary);
    }

    .search-box input {
      width: 100%;
      padding: 12px 14px 12px 44px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
    }

    .filters-bar select {
      padding: 12px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
    }

    /* Survey Cards */
    .surveys-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }

    .survey-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      transition: all 0.2s ease;
    }

    .survey-card:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    .survey-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .type-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .type-badge.nps { background: #e3f2fd; color: #1976d2; }
    .type-badge.csat { background: #e8f5e9; color: #388e3c; }
    .type-badge.ces { background: #fff3e0; color: #f57c00; }
    .type-badge.custom { background: #f3e5f5; color: #7b1fa2; }

    .status-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.6875rem;
      font-weight: 500;
    }

    .status-badge.active { background: #e8f5e9; color: #388e3c; }
    .status-badge.draft { background: #f5f5f5; color: #616161; }
    .status-badge.paused { background: #fff3e0; color: #f57c00; }
    .status-badge.completed { background: #e3f2fd; color: #1976d2; }

    .survey-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .survey-desc {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .survey-progress {
      margin-bottom: 20px;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }

    .progress-bar {
      height: 6px;
      background: var(--bg-secondary);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--primary-color);
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .survey-score {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 12px;
      margin-bottom: 16px;
    }

    .score-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .score-circle.good { background: #e8f5e9; }
    .score-circle.neutral { background: #fff3e0; }
    .score-circle.bad { background: #ffebee; }

    .score-value {
      font-size: 1.25rem;
      font-weight: 700;
    }

    .score-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .score-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .score-status {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .score-status.good { color: #388e3c; }
    .score-status.neutral { color: #f57c00; }
    .score-status.bad { color: #c62828; }

    .survey-dates {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--text-tertiary);
      margin-bottom: 20px;
    }

    .survey-dates svg {
      width: 14px;
      height: 14px;
    }

    .survey-actions {
      display: flex;
      gap: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .action-btn {
      flex: 1;
      padding: 10px;
      background: var(--bg-secondary);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .action-btn svg {
      width: 18px;
      height: 18px;
      color: var(--text-secondary);
    }

    .action-btn:hover {
      background: var(--primary-light);
    }

    .action-btn:hover svg {
      color: var(--primary-color);
    }

    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 16px;
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
      color: var(--text-tertiary);
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin-bottom: 8px;
    }

    .empty-state p {
      color: var(--text-tertiary);
      margin-bottom: 24px;
    }

    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .surveys-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SurveyListComponent implements OnInit {
  surveys = signal<Survey[]>([]);
  filteredSurveys = signal<Survey[]>([]);

  searchQuery = '';
  filterType = '';
  filterStatus = '';

  activeCount = computed(() => this.surveys().filter(s => s.status === 'ACTIVE').length);
  totalResponses = computed(() => this.surveys().reduce((sum, s) => sum + s.responseCount, 0));
  averageScore = computed(() => {
    const activeSurveys = this.surveys().filter(s => s.responseCount > 0);
    if (activeSurveys.length === 0) return 0;
    return activeSurveys.reduce((sum, s) => sum + s.averageScore, 0) / activeSurveys.length;
  });

  ngOnInit(): void {
    this.loadSurveys();
  }

  loadSurveys(): void {
    const mockSurveys: Survey[] = [
      {
        id: 's1',
        title: 'Mobil Uygulama NPS Anketi',
        description: 'Mobil bankacılık uygulaması kullanıcı deneyimi değerlendirmesi',
        status: 'ACTIVE',
        type: 'NPS',
        responseCount: 1250,
        targetCount: 2000,
        averageScore: 8.4,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        createdAt: new Date('2023-12-15'),
        createdBy: 'Ahmet Yılmaz'
      },
      {
        id: 's2',
        title: 'Şube Hizmet Memnuniyeti',
        description: 'Şube ziyareti sonrası müşteri memnuniyet anketi',
        status: 'ACTIVE',
        type: 'CSAT',
        responseCount: 845,
        targetCount: 1000,
        averageScore: 4.2,
        startDate: new Date('2024-01-15'),
        createdAt: new Date('2024-01-10'),
        createdBy: 'Zeynep Kaya'
      },
      {
        id: 's3',
        title: 'Çağrı Merkezi Kolaylık Skoru',
        description: 'Çağrı merkezi işlem kolaylığı değerlendirmesi',
        status: 'PAUSED',
        type: 'CES',
        responseCount: 320,
        targetCount: 500,
        averageScore: 3.8,
        startDate: new Date('2024-01-10'),
        createdAt: new Date('2024-01-05'),
        createdBy: 'Mehmet Demir'
      },
      {
        id: 's4',
        title: 'Yeni Kredi Süreci Anketi',
        description: 'Kredi başvuru süreci hakkında detaylı geri bildirim',
        status: 'DRAFT',
        type: 'CUSTOM',
        responseCount: 0,
        targetCount: 500,
        averageScore: 0,
        createdAt: new Date('2024-01-28'),
        createdBy: 'Elif Şahin'
      },
      {
        id: 's5',
        title: 'Q4 2023 Genel Memnuniyet',
        description: '2023 4. çeyrek genel müşteri memnuniyeti değerlendirmesi',
        status: 'COMPLETED',
        type: 'NPS',
        responseCount: 3500,
        targetCount: 3500,
        averageScore: 7.8,
        startDate: new Date('2023-10-01'),
        endDate: new Date('2023-12-31'),
        createdAt: new Date('2023-09-25'),
        createdBy: 'Ahmet Yılmaz'
      }
    ];

    this.surveys.set(mockSurveys);
    this.filteredSurveys.set(mockSurveys);
  }

  filterSurveys(): void {
    let filtered = [...this.surveys()];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }

    if (this.filterType) {
      filtered = filtered.filter(s => s.type === this.filterType);
    }

    if (this.filterStatus) {
      filtered = filtered.filter(s => s.status === this.filterStatus);
    }

    this.filteredSurveys.set(filtered);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ACTIVE': 'Aktif',
      'DRAFT': 'Taslak',
      'PAUSED': 'Duraklatıldı',
      'COMPLETED': 'Tamamlandı',
      'ARCHIVED': 'Arşivlendi'
    };
    return labels[status] || status;
  }

  getProgressPercent(survey: Survey): number {
    if (survey.targetCount === 0) return 0;
    return Math.round((survey.responseCount / survey.targetCount) * 100);
  }

  getScoreClass(score: number, type: string): string {
    if (type === 'NPS') {
      if (score >= 8) return 'good';
      if (score >= 6) return 'neutral';
      return 'bad';
    } else if (type === 'CSAT') {
      if (score >= 4) return 'good';
      if (score >= 3) return 'neutral';
      return 'bad';
    } else if (type === 'CES') {
      if (score >= 4) return 'good';
      if (score >= 3) return 'neutral';
      return 'bad';
    }
    return 'neutral';
  }

  getScoreStatus(score: number, type: string): string {
    const cls = this.getScoreClass(score, type);
    if (cls === 'good') return 'Mükemmel';
    if (cls === 'neutral') return 'Orta';
    return 'Düşük';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  pauseSurvey(survey: Survey): void {
    this.surveys.update(surveys => 
      surveys.map(s => s.id === survey.id ? { ...s, status: 'PAUSED' as const } : s)
    );
    this.filterSurveys();
  }

  activateSurvey(survey: Survey): void {
    this.surveys.update(surveys => 
      surveys.map(s => s.id === survey.id ? { ...s, status: 'ACTIVE' as const } : s)
    );
    this.filterSurveys();
  }

  copySurveyLink(survey: Survey): void {
    const link = `${window.location.origin}/survey/${survey.id}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Anket linki kopyalandı!');
    });
  }
}
