import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../core/services/report.service';
import { KPI, KPICategory, TrendDirection } from '../../core/models/report.model';

@Component({
  selector: 'app-kpi-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="kpi-dashboard">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>KPI Dashboard</h1>
          <p>Temel performans göstergelerinizi takip edin</p>
        </div>
        <div class="header-actions">
          <select [(ngModel)]="selectedPeriod" (change)="loadKPIs()">
            <option value="7">Son 7 Gün</option>
            <option value="30">Son 30 Gün</option>
            <option value="90">Son 90 Gün</option>
            <option value="365">Son 1 Yıl</option>
          </select>
          <button class="btn btn-outline" (click)="exportDashboard()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Dışa Aktar
          </button>
        </div>
      </div>

      <!-- KPI Categories -->
      <div class="kpi-categories">
        @for (category of categories; track category.value) {
          <button 
            class="category-btn"
            [class.active]="selectedCategory() === category.value"
            (click)="selectedCategory.set(category.value)"
          >
            <div class="category-icon" [innerHTML]="category.icon"></div>
            <span>{{ category.label }}</span>
          </button>
        }
      </div>

      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-icon positive">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="20" x2="12" y2="10"/>
              <line x1="18" y1="20" x2="18" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="16"/>
            </svg>
          </div>
          <div class="summary-content">
            <span class="summary-label">Toplam KPI</span>
            <span class="summary-value">{{ filteredKPIs().length }}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div class="summary-content">
            <span class="summary-label">Yükselen</span>
            <span class="summary-value">{{ risingCount() }}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div class="summary-content">
            <span class="summary-label">Sabit</span>
            <span class="summary-value">{{ stableCount() }}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="summary-icon danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
              <polyline points="17 18 23 18 23 12"/>
            </svg>
          </div>
          <div class="summary-content">
            <span class="summary-label">Düşen</span>
            <span class="summary-value">{{ fallingCount() }}</span>
          </div>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid">
        @for (kpi of filteredKPIs(); track kpi.id) {
          <div class="kpi-card" [class.alert]="kpi.isAlert">
            <div class="kpi-header">
              <span class="kpi-name">{{ kpi.name }}</span>
              <div class="kpi-trend" [class]="getTrendClass(kpi.trend)">
                @if (kpi.trend === 'UP') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                } @else if (kpi.trend === 'DOWN') {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
                    <polyline points="17 18 23 18 23 12"/>
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                }
                <span>{{ kpi.changePercent | number:'1.1-1' }}%</span>
              </div>
            </div>

            <div class="kpi-value-section">
              <span class="kpi-value">{{ formatValue(kpi.value, kpi.unit) }}</span>
              <span class="kpi-unit">{{ kpi.unit }}</span>
            </div>

            <div class="kpi-chart">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none">
                <polyline
                  [attr.points]="generateSparkline(kpi.history || [])"
                  fill="none"
                  [attr.stroke]="getSparklineColor(kpi.trend)"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>

            <div class="kpi-footer">
              <div class="kpi-target">
                <span class="target-label">Hedef:</span>
                <span class="target-value">{{ formatValue(kpi.target, kpi.unit) }}</span>
              </div>
              <div class="kpi-progress">
                <div class="progress-bar">
                  <div 
                    class="progress-fill"
                    [class]="getProgressClass(kpi.value, kpi.target)"
                    [style.width.%]="getProgressPercent(kpi.value, kpi.target)"
                  ></div>
                </div>
                <span class="progress-text">{{ getProgressPercent(kpi.value, kpi.target) | number:'1.0-0' }}%</span>
              </div>
            </div>

            @if (kpi.isAlert) {
              <div class="kpi-alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>Hedefin altında</span>
              </div>
            }
          </div>
        }
      </div>

      <!-- Comparison Table -->
      <div class="comparison-section">
        <div class="section-header">
          <h2>KPI Karşılaştırma Tablosu</h2>
          <div class="section-actions">
            <select [(ngModel)]="comparisonPeriod">
              <option value="previous">Önceki Dönem</option>
              <option value="year">Geçen Yıl</option>
            </select>
          </div>
        </div>

        <div class="comparison-table">
          <table>
            <thead>
              <tr>
                <th>KPI</th>
                <th>Mevcut</th>
                <th>{{ comparisonPeriod === 'previous' ? 'Önceki Dönem' : 'Geçen Yıl' }}</th>
                <th>Değişim</th>
                <th>Hedef</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              @for (kpi of filteredKPIs(); track kpi.id) {
                <tr>
                  <td class="kpi-name-cell">
                    <span>{{ kpi.name }}</span>
                    <span class="kpi-category-badge">{{ getCategoryLabel(kpi.category) }}</span>
                  </td>
                  <td class="value-cell">{{ formatValue(kpi.value, kpi.unit) }}</td>
                  <td class="value-cell">{{ formatValue(kpi.previousValue || 0, kpi.unit) }}</td>
                  <td class="change-cell" [class]="getTrendClass(kpi.trend)">
                    <div class="change-content">
                      @if (kpi.trend === 'UP') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="18 15 12 9 6 15"/>
                        </svg>
                      } @else if (kpi.trend === 'DOWN') {
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      }
                      <span>{{ kpi.changePercent | number:'1.1-1' }}%</span>
                    </div>
                  </td>
                  <td class="value-cell">{{ formatValue(kpi.target, kpi.unit) }}</td>
                  <td class="status-cell">
                    <span class="status-badge" [class]="getStatusClass(kpi.value, kpi.target)">
                      {{ getStatusLabel(kpi.value, kpi.target) }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-dashboard {
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

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .header-actions select {
      padding: 10px 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      background: white;
      cursor: pointer;
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
    }

    .btn svg {
      width: 18px;
      height: 18px;
    }

    .btn-outline {
      background: white;
      border: 1px solid var(--border-color);
      color: var(--text-primary);
    }

    .btn-outline:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    /* Categories */
    .kpi-categories {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      overflow-x: auto;
      padding-bottom: 8px;
    }

    .category-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .category-btn:hover {
      border-color: var(--primary-color);
    }

    .category-btn.active {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: white;
    }

    .category-icon {
      width: 20px;
      height: 20px;
    }

    .category-icon svg {
      width: 100%;
      height: 100%;
    }

    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .summary-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .summary-icon svg {
      width: 24px;
      height: 24px;
    }

    .summary-icon.positive { background: #e3f2fd; color: #1976d2; }
    .summary-icon.success { background: #e8f5e9; color: #388e3c; }
    .summary-icon.warning { background: #fff3e0; color: #f57c00; }
    .summary-icon.danger { background: #ffebee; color: #c62828; }

    .summary-content {
      display: flex;
      flex-direction: column;
    }

    .summary-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .summary-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .kpi-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      position: relative;
      transition: all 0.2s ease;
    }

    .kpi-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .kpi-card.alert {
      border-color: var(--error-color);
    }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .kpi-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .kpi-trend {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .kpi-trend svg {
      width: 14px;
      height: 14px;
    }

    .kpi-trend.up { background: #e8f5e9; color: #388e3c; }
    .kpi-trend.down { background: #ffebee; color: #c62828; }
    .kpi-trend.stable { background: #f5f5f5; color: #757575; }

    .kpi-value-section {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 16px;
    }

    .kpi-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .kpi-unit {
      font-size: 0.875rem;
      color: var(--text-tertiary);
    }

    .kpi-chart {
      height: 40px;
      margin-bottom: 16px;
    }

    .kpi-chart svg {
      width: 100%;
      height: 100%;
    }

    .kpi-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .kpi-target {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
    }

    .target-label {
      color: var(--text-tertiary);
    }

    .target-value {
      font-weight: 600;
      color: var(--text-primary);
    }

    .kpi-progress {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .progress-bar {
      width: 60px;
      height: 6px;
      background: var(--bg-secondary);
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .progress-fill.success { background: var(--success-color); }
    .progress-fill.warning { background: var(--warning-color); }
    .progress-fill.danger { background: var(--error-color); }

    .progress-text {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .kpi-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      padding: 8px 12px;
      background: #ffebee;
      border-radius: 8px;
      font-size: 0.75rem;
      color: var(--error-color);
    }

    .kpi-alert svg {
      width: 16px;
      height: 16px;
    }

    /* Comparison Section */
    .comparison-section {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
    }

    .section-header h2 {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .section-actions select {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .comparison-table {
      overflow-x: auto;
    }

    .comparison-table table {
      width: 100%;
      border-collapse: collapse;
    }

    .comparison-table th,
    .comparison-table td {
      padding: 16px 24px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .comparison-table th {
      background: var(--bg-secondary);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--text-secondary);
    }

    .comparison-table tbody tr:hover {
      background: var(--bg-secondary);
    }

    .kpi-name-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kpi-name-cell span:first-child {
      font-weight: 500;
    }

    .kpi-category-badge {
      font-size: 0.625rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .value-cell {
      font-weight: 600;
      color: var(--text-primary);
    }

    .change-cell {
      font-weight: 600;
    }

    .change-cell.up { color: var(--success-color); }
    .change-cell.down { color: var(--error-color); }
    .change-cell.stable { color: var(--text-tertiary); }

    .change-content {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .change-content svg {
      width: 16px;
      height: 16px;
    }

    .status-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.success { background: #e8f5e9; color: #388e3c; }
    .status-badge.warning { background: #fff3e0; color: #f57c00; }
    .status-badge.danger { background: #ffebee; color: #c62828; }

    @media (max-width: 1024px) {
      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .kpi-categories {
        flex-wrap: nowrap;
      }

      .comparison-table th,
      .comparison-table td {
        padding: 12px 16px;
      }
    }
  `]
})
export class KpiDashboardComponent implements OnInit {
  private reportsService = inject(ReportService);

  kpis = signal<KPI[]>([]);
  selectedCategory = signal<string>('ALL');
  selectedPeriod = '30';
  comparisonPeriod = 'previous';

  categories = [
    { value: 'ALL', label: 'Tümü', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' },
    { value: 'CUSTOMER_SATISFACTION', label: 'Müşteri Memnuniyeti', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' },
    { value: 'RESPONSE_TIME', label: 'Yanıt Süresi', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
    { value: 'RESOLUTION', label: 'Çözüm', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
    { value: 'ENGAGEMENT', label: 'Etkileşim', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
    { value: 'PERFORMANCE', label: 'Performans', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' }
  ];

  filteredKPIs = computed(() => {
    const category = this.selectedCategory();
    if (category === 'ALL') {
      return this.kpis();
    }
    return this.kpis().filter(kpi => kpi.category === category);
  });

  risingCount = computed(() => 
    this.filteredKPIs().filter(kpi => kpi.trend === TrendDirection.UP).length
  );

  stableCount = computed(() => 
    this.filteredKPIs().filter(kpi => kpi.trend === TrendDirection.STABLE).length
  );

  fallingCount = computed(() => 
    this.filteredKPIs().filter(kpi => kpi.trend === TrendDirection.DOWN).length
  );

  ngOnInit(): void {
    this.loadKPIs();
  }

  loadKPIs(): void {
    // Mock data
    const mockKPIs: KPI[] = [
      {
        id: '1',
        name: 'NPS Skoru',
        value: 72,
        target: 80,
        unit: 'puan',
        trend: TrendDirection.UP,
        changePercent: 5.2,
        previousValue: 68,
        category: KPICategory.CUSTOMER_SATISFACTION,
        isAlert: false,
        history: [65, 68, 70, 67, 72, 75, 72]
      },
      {
        id: '2',
        name: 'CSAT Oranı',
        value: 4.2,
        target: 4.5,
        unit: '/5',
        trend: TrendDirection.STABLE,
        changePercent: 0.5,
        previousValue: 4.18,
        category: KPICategory.CUSTOMER_SATISFACTION,
        isAlert: false,
        history: [4.1, 4.15, 4.2, 4.18, 4.22, 4.2, 4.2]
      },
      {
        id: '3',
        name: 'Ortalama Yanıt Süresi',
        value: 2.4,
        target: 2,
        unit: 'saat',
        trend: TrendDirection.DOWN,
        changePercent: -8.5,
        previousValue: 2.6,
        category: KPICategory.RESPONSE_TIME,
        isAlert: true,
        history: [3.2, 2.8, 2.6, 2.5, 2.4, 2.5, 2.4]
      },
      {
        id: '4',
        name: 'İlk Temas Çözüm Oranı',
        value: 67,
        target: 75,
        unit: '%',
        trend: TrendDirection.UP,
        changePercent: 3.1,
        previousValue: 65,
        category: KPICategory.RESOLUTION,
        isAlert: true,
        history: [60, 62, 64, 65, 66, 68, 67]
      },
      {
        id: '5',
        name: 'Müşteri Efor Skoru',
        value: 3.8,
        target: 3.5,
        unit: '/7',
        trend: TrendDirection.DOWN,
        changePercent: -5.0,
        previousValue: 4.0,
        category: KPICategory.CUSTOMER_SATISFACTION,
        isAlert: false,
        history: [4.2, 4.1, 4.0, 3.9, 3.85, 3.82, 3.8]
      },
      {
        id: '6',
        name: 'Sosyal Medya Etkileşimi',
        value: 12500,
        target: 15000,
        unit: 'etkileşim',
        trend: TrendDirection.UP,
        changePercent: 12.3,
        previousValue: 11130,
        category: KPICategory.ENGAGEMENT,
        isAlert: false,
        history: [9000, 9800, 10500, 11130, 11800, 12200, 12500]
      },
      {
        id: '7',
        name: 'Şikayet Çözüm Süresi',
        value: 18,
        target: 24,
        unit: 'saat',
        trend: TrendDirection.UP,
        changePercent: -10.0,
        previousValue: 20,
        category: KPICategory.RESOLUTION,
        isAlert: false,
        history: [28, 25, 22, 20, 19, 18.5, 18]
      },
      {
        id: '8',
        name: 'Agent Performansı',
        value: 85,
        target: 90,
        unit: '%',
        trend: TrendDirection.STABLE,
        changePercent: 1.2,
        previousValue: 84,
        category: KPICategory.PERFORMANCE,
        isAlert: false,
        history: [82, 83, 84, 84, 85, 85, 85]
      }
    ];

    this.kpis.set(mockKPIs);
  }

  getTrendClass(trend: TrendDirection): string {
    const classes: Record<TrendDirection, string> = {
      [TrendDirection.UP]: 'up',
      [TrendDirection.DOWN]: 'down',
      [TrendDirection.STABLE]: 'stable'
    };
    return classes[trend];
  }

  formatValue(value: number, unit: string): string {
    if (unit === '%' || unit === 'puan') {
      return value.toFixed(0);
    }
    if (unit.includes('/')) {
      return value.toFixed(1);
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toFixed(1);
  }

  generateSparkline(history: number[]): string {
    if (!history || history.length === 0) {
      return '0,15 100,15';
    }

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;

    return history.map((value, index) => {
      const x = (index / (history.length - 1)) * 100;
      const y = 30 - ((value - min) / range) * 25;
      return `${x},${y}`;
    }).join(' ');
  }

  getSparklineColor(trend: TrendDirection): string {
    const colors: Record<TrendDirection, string> = {
      [TrendDirection.UP]: '#388e3c',
      [TrendDirection.DOWN]: '#c62828',
      [TrendDirection.STABLE]: '#757575'
    };
    return colors[trend];
  }

  getProgressPercent(value: number, target: number): number {
    return Math.min((value / target) * 100, 100);
  }

  getProgressClass(value: number, target: number): string {
    const percent = (value / target) * 100;
    if (percent >= 100) return 'success';
    if (percent >= 80) return 'warning';
    return 'danger';
  }

  getCategoryLabel(category: KPICategory): string {
    const labels: Record<KPICategory, string> = {
      [KPICategory.CUSTOMER_SATISFACTION]: 'Müşteri Memnuniyeti',
      [KPICategory.SENTIMENT]: 'Duygu Analizi',
      [KPICategory.RESPONSE_TIME]: 'Yanıt Süresi',
      [KPICategory.RESOLUTION_RATE]: 'Çözüm Oranı',
      [KPICategory.RESOLUTION]: 'Çözüm',
      [KPICategory.VOLUME]: 'Hacim',
      [KPICategory.ENGAGEMENT]: 'Etkileşim',
      [KPICategory.LOYALTY]: 'Sadakat',
      [KPICategory.PERFORMANCE]: 'Performans'
    };
    return labels[category];
  }

  getStatusClass(value: number, target: number): string {
    const percent = (value / target) * 100;
    if (percent >= 100) return 'success';
    if (percent >= 80) return 'warning';
    return 'danger';
  }

  getStatusLabel(value: number, target: number): string {
    const percent = (value / target) * 100;
    if (percent >= 100) return 'Hedefe Ulaşıldı';
    if (percent >= 80) return 'Yaklaşıyor';
    return 'Geride';
  }

  exportDashboard(): void {
    console.log('Export dashboard');
  }
}
