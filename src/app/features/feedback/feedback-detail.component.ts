import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Feedback, FeedbackStatus, FeedbackPriority, Sentiment, Channel, FeedbackCategory, SentimentType, FeedbackSource } from '../../core/models/feedback.model';

@Component({
  selector: 'app-feedback-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="feedback-detail">
      <!-- Header -->
      <div class="detail-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div class="header-info">
            <span class="feedback-id">#{{ feedback().id }}</span>
            <h1>{{ feedback().title || 'Müşteri Geri Bildirimi' }}</h1>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="exportFeedback()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Dışa Aktar
          </button>
          <button class="btn btn-primary" (click)="createTask()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Görev Oluştur
          </button>
        </div>
      </div>

      <div class="detail-layout">
        <!-- Main Content -->
        <div class="main-content">
          <!-- Feedback Content Card -->
          <div class="content-card">
            <div class="card-header">
              <div class="source-info">
                <span class="channel-badge" [class]="(feedback().channel || 'INSTAGRAM').toLowerCase()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    @switch (feedback().channel) {
                      @case ('INSTAGRAM') {
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                      }
                      @case ('TWITTER') {
                        <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                      }
                      @case ('FACEBOOK') {
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                      }
                      @case ('GOOGLE') {
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M8 12h8M12 8v8"/>
                      }
                      @case ('CALL_CENTER') {
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                      }
                      @default {
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      }
                    }
                  </svg>
                  {{ getChannelLabel(feedback().channel || Channel.INSTAGRAM) }}
                </span>
                <span class="date">{{ feedback().createdAt | date:'dd MMM yyyy HH:mm' }}</span>
              </div>
              <div class="status-actions">
                <select [(ngModel)]="selectedStatus" class="status-select" [class]="selectedStatus.toLowerCase()">
                  <option value="NEW">Yeni</option>
                  <option value="IN_PROGRESS">İşlemde</option>
                  <option value="RESOLVED">Çözüldü</option>
                  <option value="CLOSED">Kapatıldı</option>
                </select>
              </div>
            </div>

            <div class="feedback-content">
              <p>{{ feedback().content }}</p>
            </div>

            <div class="feedback-meta">
              <div class="meta-row">
                <span class="meta-label">Duygu</span>
                <span class="sentiment-badge" [class]="feedback().sentiment.toLowerCase()">
                  @switch (feedback().sentiment) {
                    @case ('POSITIVE') { 😊 Pozitif }
                    @case ('NEUTRAL') { 😐 Nötr }
                    @case ('NEGATIVE') { 😞 Negatif }
                  }
                </span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Öncelik</span>
                <span class="priority-badge" [class]="feedback().priority.toLowerCase()">
                  {{ getPriorityLabel(feedback().priority) }}
                </span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Kategori</span>
                <span class="category-badge">{{ feedback().category }}</span>
              </div>
            </div>

            @if (feedback().tags && feedback().tags.length > 0) {
              <div class="tags-section">
                <span class="meta-label">Etiketler</span>
                <div class="tags">
                  @for (tag of feedback().tags; track tag) {
                    <span class="tag">{{ tag }}</span>
                  }
                </div>
              </div>
            }
          </div>

          <!-- AI Analysis Card -->
          <div class="content-card analysis-card">
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                <polyline points="2 17 12 22 22 17"/>
                <polyline points="2 12 12 17 22 12"/>
              </svg>
              AI Analizi
            </h2>
            
            <div class="analysis-section">
              <h3>Duygu Skoru</h3>
              <div class="sentiment-score">
                <div class="score-bar">
                  <div 
                    class="score-fill" 
                    [class]="feedback().sentiment.toLowerCase()"
                    [style.width.%]="getSentimentScore()"
                  ></div>
                </div>
                <span class="score-value">{{ getSentimentScore() }}%</span>
              </div>
            </div>

            <div class="analysis-section">
              <h3>Tespit Edilen Konular</h3>
              <div class="topics">
                @for (topic of detectedTopics(); track topic.name) {
                  <div class="topic-item">
                    <span class="topic-name">{{ topic.name }}</span>
                    <div class="topic-bar">
                      <div class="topic-fill" [style.width.%]="topic.confidence"></div>
                    </div>
                    <span class="topic-conf">{{ topic.confidence }}%</span>
                  </div>
                }
              </div>
            </div>

            <div class="analysis-section">
              <h3>Anahtar Kelimeler</h3>
              <div class="keywords">
                @for (kw of keywords(); track kw) {
                  <span class="keyword">{{ kw }}</span>
                }
              </div>
            </div>

            <div class="analysis-section">
              <h3>Önerilen Aksiyonlar</h3>
              <div class="suggestions">
                @for (suggestion of suggestions(); track suggestion) {
                  <div class="suggestion-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span>{{ suggestion }}</span>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Related Feedbacks -->
          <div class="content-card">
            <h2>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              Benzer Geri Bildirimler
            </h2>
            <div class="related-list">
              @for (item of relatedFeedbacks(); track item.id) {
                <div class="related-item" (click)="viewFeedback(item.id)">
                  <div class="related-content">
                    <span class="related-text">{{ item.content | slice:0:100 }}...</span>
                    <span class="related-meta">
                      <span class="sentiment-dot" [class]="item.sentiment.toLowerCase()"></span>
                      {{ item.createdAt | date:'dd MMM' }}
                    </span>
                  </div>
                  <span class="similarity">{{ item.similarity }}% benzer</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="detail-sidebar">
          <!-- Customer Info -->
          <div class="sidebar-card">
            <h3>Müşteri Bilgileri</h3>
            <div class="customer-info">
              <div class="customer-avatar">
                {{ getCustomerInitials() }}
              </div>
              <div class="customer-details">
                <span class="customer-name">{{ feedback().customerName || 'Anonim' }}</span>
                @if (feedback().customerId) {
                  <span class="customer-id">ID: {{ feedback().customerId }}</span>
                }
              </div>
            </div>
            @if (customerStats()) {
              <div class="customer-stats">
                <div class="cstat-item">
                  <span class="cstat-value">{{ customerStats()!.totalFeedbacks }}</span>
                  <span class="cstat-label">Toplam Geri Bildirim</span>
                </div>
                <div class="cstat-item">
                  <span class="cstat-value" [class]="customerStats()!.avgSentiment.toLowerCase()">
                    {{ getSentimentEmoji(customerStats()!.avgSentiment) }}
                  </span>
                  <span class="cstat-label">Ort. Duygu</span>
                </div>
                <div class="cstat-item">
                  <span class="cstat-value">{{ customerStats()!.customerSince }}</span>
                  <span class="cstat-label">Müşteri Olma</span>
                </div>
              </div>
            }
          </div>

          <!-- Assignment -->
          <div class="sidebar-card">
            <h3>Atama</h3>
            <div class="assignment-section">
              <label>Atanan Kişi</label>
              <select [(ngModel)]="assignedUser" class="form-select">
                <option value="">Seçiniz</option>
                <option value="user1">Ahmet Yılmaz</option>
                <option value="user2">Ayşe Demir</option>
                <option value="user3">Mehmet Kaya</option>
              </select>
            </div>
            <div class="assignment-section">
              <label>Departman</label>
              <select [(ngModel)]="assignedDept" class="form-select">
                <option value="">Seçiniz</option>
                <option value="cx">Müşteri Deneyimi</option>
                <option value="support">Müşteri Hizmetleri</option>
                <option value="product">Ürün</option>
                <option value="it">IT</option>
              </select>
            </div>
            <button class="btn btn-outline btn-block" (click)="updateAssignment()">
              Atamayı Güncelle
            </button>
          </div>

          <!-- Activity Timeline -->
          <div class="sidebar-card">
            <h3>Aktivite</h3>
            <div class="activity-timeline">
              @for (activity of activities(); track activity.id) {
                <div class="activity-item">
                  <div class="activity-dot" [class]="activity.type"></div>
                  <div class="activity-content">
                    <span class="activity-text">{{ activity.text }}</span>
                    <span class="activity-time">{{ activity.timestamp | date:'dd MMM HH:mm' }}</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Notes -->
          <div class="sidebar-card">
            <h3>Notlar</h3>
            <div class="notes-section">
              @for (note of notes(); track note.id) {
                <div class="note-item">
                  <p>{{ note.content }}</p>
                  <span class="note-meta">{{ note.author }} - {{ note.createdAt | date:'dd MMM HH:mm' }}</span>
                </div>
              }
              <div class="add-note">
                <textarea 
                  [(ngModel)]="newNote" 
                  placeholder="Not ekle..."
                  rows="2"
                ></textarea>
                <button class="btn btn-sm btn-primary" (click)="addNote()">Ekle</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .feedback-detail {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .back-btn {
      width: 40px;
      height: 40px;
      background: var(--bg-secondary);
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .back-btn svg {
      width: 20px;
      height: 20px;
    }

    .feedback-id {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
    }

    .header-info h1 {
      font-size: 1.5rem;
      margin: 0;
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
      color: var(--text-primary);
    }

    .btn-block {
      width: 100%;
      justify-content: center;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 0.8125rem;
    }

    /* Layout */
    .detail-layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 24px;
    }

    /* Content Cards */
    .content-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      margin-bottom: 20px;
    }

    .content-card h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1rem;
      margin-bottom: 20px;
    }

    .content-card h2 svg {
      width: 20px;
      height: 20px;
      color: var(--primary-color);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .source-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .channel-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .channel-badge svg {
      width: 16px;
      height: 16px;
    }

    .channel-badge.instagram { background: #fce7f3; color: #db2777; }
    .channel-badge.twitter { background: #dbeafe; color: #2563eb; }
    .channel-badge.facebook { background: #dbeafe; color: #1d4ed8; }
    .channel-badge.google { background: #fee2e2; color: #dc2626; }
    .channel-badge.call_center { background: #d1fae5; color: #059669; }

    .date {
      font-size: 0.8125rem;
      color: var(--text-tertiary);
    }

    .status-select {
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.8125rem;
      font-weight: 500;
      border: none;
    }

    .status-select.new { background: #dbeafe; color: #2563eb; }
    .status-select.in_progress { background: #fef3c7; color: #d97706; }
    .status-select.resolved { background: #d1fae5; color: #059669; }
    .status-select.closed { background: #f3f4f6; color: #6b7280; }

    .feedback-content {
      margin-bottom: 20px;
    }

    .feedback-content p {
      font-size: 1rem;
      line-height: 1.7;
      color: var(--text-primary);
    }

    .feedback-meta {
      display: flex;
      gap: 24px;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .meta-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .sentiment-badge {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .sentiment-badge.positive { color: #22c55e; }
    .sentiment-badge.neutral { color: #f59e0b; }
    .sentiment-badge.negative { color: #ef4444; }

    .priority-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .priority-badge.critical { background: #fee2e2; color: #dc2626; }
    .priority-badge.high { background: #fef3c7; color: #d97706; }
    .priority-badge.medium { background: #dbeafe; color: #2563eb; }
    .priority-badge.low { background: #f3f4f6; color: #6b7280; }

    .category-badge {
      font-size: 0.8125rem;
      color: var(--text-primary);
    }

    .tags-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tag {
      padding: 4px 12px;
      background: var(--bg-secondary);
      border-radius: 16px;
      font-size: 0.8125rem;
    }

    /* Analysis Card */
    .analysis-section {
      margin-bottom: 24px;
    }

    .analysis-section:last-child {
      margin-bottom: 0;
    }

    .analysis-section h3 {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .sentiment-score {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .score-bar {
      flex: 1;
      height: 12px;
      background: var(--bg-secondary);
      border-radius: 6px;
      overflow: hidden;
    }

    .score-fill {
      height: 100%;
      border-radius: 6px;
    }

    .score-fill.positive { background: #22c55e; }
    .score-fill.neutral { background: #f59e0b; }
    .score-fill.negative { background: #ef4444; }

    .score-value {
      font-weight: 600;
      width: 50px;
    }

    .topics {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .topic-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .topic-name {
      width: 120px;
      font-size: 0.875rem;
    }

    .topic-bar {
      flex: 1;
      height: 8px;
      background: var(--bg-secondary);
      border-radius: 4px;
      overflow: hidden;
    }

    .topic-fill {
      height: 100%;
      background: var(--primary-color);
      border-radius: 4px;
    }

    .topic-conf {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      width: 40px;
    }

    .keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .keyword {
      padding: 6px 12px;
      background: var(--primary-light);
      color: var(--primary-color);
      border-radius: 16px;
      font-size: 0.8125rem;
    }

    .suggestions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .suggestion-item {
      display: flex;
      gap: 10px;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .suggestion-item svg {
      width: 18px;
      height: 18px;
      color: var(--primary-color);
      flex-shrink: 0;
    }

    .suggestion-item span {
      font-size: 0.875rem;
    }

    /* Related Feedbacks */
    .related-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .related-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .related-item:hover {
      background: var(--border-color);
    }

    .related-content {
      flex: 1;
    }

    .related-text {
      display: block;
      font-size: 0.875rem;
      margin-bottom: 4px;
    }

    .related-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .sentiment-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .sentiment-dot.positive { background: #22c55e; }
    .sentiment-dot.neutral { background: #f59e0b; }
    .sentiment-dot.negative { background: #ef4444; }

    .similarity {
      font-size: 0.75rem;
      color: var(--primary-color);
      font-weight: 500;
    }

    /* Sidebar */
    .sidebar-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      margin-bottom: 16px;
    }

    .sidebar-card h3 {
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .customer-info {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .customer-avatar {
      width: 48px;
      height: 48px;
      background: var(--primary-light);
      color: var(--primary-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .customer-details {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .customer-name {
      font-weight: 500;
    }

    .customer-id {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .customer-stats {
      display: flex;
      gap: 12px;
    }

    .cstat-item {
      flex: 1;
      text-align: center;
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
    }

    .cstat-value {
      display: block;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .cstat-label {
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }

    .assignment-section {
      margin-bottom: 12px;
    }

    .assignment-section label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-bottom: 4px;
    }

    .form-select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
    }

    /* Activity Timeline */
    .activity-timeline {
      position: relative;
      padding-left: 24px;
    }

    .activity-timeline::before {
      content: '';
      position: absolute;
      left: 7px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--border-color);
    }

    .activity-item {
      position: relative;
      margin-bottom: 16px;
    }

    .activity-dot {
      position: absolute;
      left: -24px;
      top: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--border-color);
      border: 2px solid white;
    }

    .activity-dot.created { background: #22c55e; }
    .activity-dot.assigned { background: #3b82f6; }
    .activity-dot.status { background: #f59e0b; }
    .activity-dot.note { background: #8b5cf6; }

    .activity-text {
      display: block;
      font-size: 0.8125rem;
    }

    .activity-time {
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }

    /* Notes */
    .note-item {
      padding: 12px;
      background: var(--bg-secondary);
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .note-item p {
      font-size: 0.8125rem;
      margin: 0 0 8px;
    }

    .note-meta {
      font-size: 0.6875rem;
      color: var(--text-tertiary);
    }

    .add-note {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .add-note textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      resize: none;
    }

    .add-note button {
      align-self: flex-end;
    }

    @media (max-width: 1200px) {
      .detail-layout {
        grid-template-columns: 1fr;
      }

      .detail-sidebar {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
    }

    @media (max-width: 768px) {
      .detail-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .detail-sidebar {
        grid-template-columns: 1fr;
      }

      .feedback-meta {
        flex-direction: column;
        gap: 12px;
      }
    }
  `]
})
export class FeedbackDetailComponent {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Expose enums to template
  Channel = Channel;

  selectedStatus = 'IN_PROGRESS';
  assignedUser = 'user1';
  assignedDept = 'cx';
  newNote = '';

  feedback = signal<Feedback>({
    id: 'FB-2024-001234',
    content: 'Mobil bankacılık uygulamanızı kullanmaya başladığımdan beri çok memnunum. Arayüz çok kullanışlı ve işlemler hızlı bir şekilde gerçekleşiyor. Özellikle yeni eklenen koyu tema özelliği çok güzel olmuş. Tek şikayetim bazen para transferi işlemlerinde küçük gecikmeler yaşanması. Genel olarak 5 üzerinden 4 puan veririm. Teşekkürler Albaraka!',
    source: FeedbackSource.SOCIAL_MEDIA,
    platform: Channel.INSTAGRAM,
    channel: Channel.INSTAGRAM,
    originalLanguage: 'tr',
    sentiment: Sentiment.POSITIVE,
    sentimentScore: 0.85,
    priority: FeedbackPriority.MEDIUM,
    status: FeedbackStatus.IN_PROGRESS,
    category: FeedbackCategory.MOBILE_APP,
    tags: ['mobil uygulama', 'kullanıcı deneyimi', 'transfer', 'koyu tema'],
    rootCauses: [],
    metadata: {},
    createdAt: new Date('2024-01-07T14:30:00'),
    updatedAt: new Date('2024-01-07T14:30:00'),
    customerName: 'Mehmet Yıldırım',
    customerId: 'CUS-789456'
  });

  detectedTopics = signal([
    { name: 'Mobil Uygulama', confidence: 95 },
    { name: 'Kullanıcı Deneyimi', confidence: 88 },
    { name: 'Para Transferi', confidence: 72 },
    { name: 'Tasarım', confidence: 65 }
  ]);

  keywords = signal([
    'mobil bankacılık', 'kullanışlı', 'hızlı', 'koyu tema', 'transfer', 'gecikme', 'memnun'
  ]);

  suggestions = signal([
    'Para transferi gecikmeleri için teknik ekibe iletim yapılabilir',
    'Müşteriye teşekkür mesajı gönderilebilir',
    'Mobil uygulama memnuniyet istatistiklerine eklenebilir'
  ]);

  relatedFeedbacks = signal([
    { id: 'FB-001', content: 'Mobil uygulama çok güzel olmuş, sürekli kullanıyorum. Tek eksik bildirim ayarları.', sentiment: 'POSITIVE', createdAt: new Date('2024-01-05'), similarity: 87 },
    { id: 'FB-002', content: 'Transfer işlemlerinde bazen 30 saniye bekliyorum, bu düzeltilebilir mi?', sentiment: 'NEUTRAL', createdAt: new Date('2024-01-04'), similarity: 76 },
    { id: 'FB-003', content: 'Koyu tema için teşekkürler, gözlerim artık yorulmuyor.', sentiment: 'POSITIVE', createdAt: new Date('2024-01-03'), similarity: 72 }
  ]);

  customerStats = signal({
    totalFeedbacks: 12,
    avgSentiment: 'POSITIVE',
    customerSince: '3 yıl'
  });

  activities = signal([
    { id: 'a1', type: 'created', text: 'Geri bildirim oluşturuldu', timestamp: new Date('2024-01-07T14:30:00') },
    { id: 'a2', type: 'assigned', text: 'Ahmet Yılmaz\'a atandı', timestamp: new Date('2024-01-07T14:35:00') },
    { id: 'a3', type: 'status', text: 'Durum "İşlemde" olarak güncellendi', timestamp: new Date('2024-01-07T14:36:00') },
    { id: 'a4', type: 'note', text: 'Not eklendi', timestamp: new Date('2024-01-07T15:00:00') }
  ]);

  notes = signal([
    { id: 'n1', content: 'Müşteri ile iletişime geçildi, memnuniyeti için teşekkür edildi.', author: 'Ahmet Yılmaz', createdAt: new Date('2024-01-07T15:00:00') }
  ]);

  getChannelLabel(channel: Channel): string {
    const labels: Partial<Record<Channel, string>> = {
      [Channel.INSTAGRAM]: 'Instagram',
      [Channel.TWITTER]: 'Twitter',
      [Channel.FACEBOOK]: 'Facebook',
      [Channel.GOOGLE_REVIEWS]: 'Google',
      [Channel.APP_STORE]: 'App Store',
      [Channel.PLAY_STORE]: 'Play Store',
      [Channel.CALL_CENTER]: 'Çağrı Merkezi',
      [Channel.EMAIL]: 'E-posta',
      [Channel.WEB]: 'Web',
      [Channel.SURVEY]: 'Anket',
      [Channel.BRANCH]: 'Şube',
      [Channel.COMPLAINT_SITE]: 'Şikayet Sitesi',
      [Channel.YOUTUBE]: 'YouTube',
      [Channel.LINKEDIN]: 'LinkedIn',
      [Channel.GOOGLE]: 'Google',
      [Channel.APP_STORE_IOS]: 'App Store iOS',
      [Channel.SIKAYETVAR]: 'Şikayetvar',
      [Channel.EKSI_SOZLUK]: 'Ekşi Sözlük',
      [Channel.INTERNAL]: 'Dahili',
      [Channel.OTHER]: 'Diğer'
    };
    return labels[channel] || channel;
  }

  getPriorityLabel(priority: FeedbackPriority): string {
    const labels: Record<FeedbackPriority, string> = {
      [FeedbackPriority.CRITICAL]: 'Kritik',
      [FeedbackPriority.HIGH]: 'Yüksek',
      [FeedbackPriority.MEDIUM]: 'Orta',
      [FeedbackPriority.LOW]: 'Düşük'
    };
    return labels[priority];
  }

  getSentimentScore(): number {
    const scores: Record<Sentiment, number> = {
      [Sentiment.POSITIVE]: 85,
      [Sentiment.NEUTRAL]: 50,
      [Sentiment.NEGATIVE]: 25,
      [SentimentType.MIXED]: 0.5
    };
    return scores[this.feedback().sentiment];
  }

  getSentimentEmoji(sentiment: string): string {
    const emojis: Record<string, string> = {
      'POSITIVE': '😊',
      'NEUTRAL': '😐',
      'NEGATIVE': '😞'
    };
    return emojis[sentiment] || '😐';
  }

  getCustomerInitials(): string {
    const name = this.feedback().author || 'A';
    const parts = name.split(' ');
    return parts.map((p: string) => p.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  goBack(): void {
    this.router.navigate(['/feedback']);
  }

  exportFeedback(): void {
    console.log('Exporting feedback');
  }

  createTask(): void {
    this.router.navigate(['/tasks/new'], { 
      queryParams: { feedbackId: this.feedback().id }
    });
  }

  updateAssignment(): void {
    console.log('Updating assignment:', this.assignedUser, this.assignedDept);
  }

  addNote(): void {
    if (this.newNote.trim()) {
      this.notes.update(notes => [
        ...notes,
        {
          id: `n${Date.now()}`,
          content: this.newNote,
          author: 'Ahmet Yılmaz',
          createdAt: new Date()
        }
      ]);
      this.newNote = '';
    }
  }

  viewFeedback(id: string): void {
    this.router.navigate(['/feedback', id]);
  }
}
