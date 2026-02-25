import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

interface Question {
  id: string;
  type: 'NPS' | 'RATING' | 'CHOICE' | 'MULTIPLE' | 'TEXT' | 'MATRIX';
  text: string;
  required: boolean;
  options?: string[];
  minLabel?: string;
  maxLabel?: string;
  rows?: string[];
  columns?: string[];
}

interface Survey {
  id?: string;
  title: string;
  description: string;
  type: 'NPS' | 'CSAT' | 'CES' | 'CUSTOM';
  welcomeMessage: string;
  thankYouMessage: string;
  questions: Question[];
  settings: {
    allowAnonymous: boolean;
    showProgress: boolean;
    randomizeQuestions: boolean;
    limitResponses: boolean;
    maxResponses?: number;
    startDate?: string;
    endDate?: string;
  };
}

@Component({
  selector: 'app-survey-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="survey-builder">
      <!-- Header -->
      <div class="builder-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div class="title-section">
            <input 
              type="text" 
              class="title-input"
              [(ngModel)]="survey.title"
              placeholder="Anket Başlığı"
            />
            <input 
              type="text" 
              class="desc-input"
              [(ngModel)]="survey.description"
              placeholder="Kısa açıklama ekleyin..."
            />
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="preview()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Önizle
          </button>
          <button class="btn btn-primary" (click)="saveSurvey()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Kaydet
          </button>
        </div>
      </div>

      <div class="builder-layout">
        <!-- Sidebar -->
        <div class="builder-sidebar">
          <div class="sidebar-section">
            <h3>Anket Tipi</h3>
            <div class="type-options">
              @for (type of surveyTypes; track type.value) {
                <button 
                  class="type-option"
                  [class.active]="survey.type === type.value"
                  (click)="setSurveyType(type.value)"
                >
                  <span class="type-name">{{ type.label }}</span>
                  <span class="type-desc">{{ type.description }}</span>
                </button>
              }
            </div>
          </div>

          <div class="sidebar-section">
            <h3>Soru Ekle</h3>
            <div class="question-types">
              @for (qType of questionTypes; track qType.type) {
                <button class="question-type-btn" (click)="addQuestion(qType.type)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    @switch (qType.type) {
                      @case ('NPS') {
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="8" y1="12" x2="16" y2="12"/>
                      }
                      @case ('RATING') {
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      }
                      @case ('CHOICE') {
                        <circle cx="12" cy="12" r="10"/>
                        <circle cx="12" cy="12" r="3"/>
                      }
                      @case ('MULTIPLE') {
                        <polyline points="9 11 12 14 22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                      }
                      @case ('TEXT') {
                        <line x1="17" y1="10" x2="3" y2="10"/>
                        <line x1="21" y1="6" x2="3" y2="6"/>
                        <line x1="21" y1="14" x2="3" y2="14"/>
                        <line x1="17" y1="18" x2="3" y2="18"/>
                      }
                      @case ('MATRIX') {
                        <rect x="3" y="3" width="7" height="7"/>
                        <rect x="14" y="3" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/>
                        <rect x="3" y="14" width="7" height="7"/>
                      }
                    }
                  </svg>
                  <span>{{ qType.label }}</span>
                </button>
              }
            </div>
          </div>

          <div class="sidebar-section">
            <h3>Ayarlar</h3>
            <div class="settings-list">
              <label class="setting-toggle">
                <input type="checkbox" [(ngModel)]="survey.settings.allowAnonymous" />
                <span class="toggle-switch"></span>
                <span>Anonim yanıtlar</span>
              </label>
              <label class="setting-toggle">
                <input type="checkbox" [(ngModel)]="survey.settings.showProgress" />
                <span class="toggle-switch"></span>
                <span>İlerleme göster</span>
              </label>
              <label class="setting-toggle">
                <input type="checkbox" [(ngModel)]="survey.settings.randomizeQuestions" />
                <span class="toggle-switch"></span>
                <span>Soruları karıştır</span>
              </label>
              <label class="setting-toggle">
                <input type="checkbox" [(ngModel)]="survey.settings.limitResponses" />
                <span class="toggle-switch"></span>
                <span>Yanıt limiti</span>
              </label>
              @if (survey.settings.limitResponses) {
                <input 
                  type="number" 
                  class="limit-input"
                  [(ngModel)]="survey.settings.maxResponses"
                  placeholder="Max yanıt sayısı"
                />
              }
            </div>
          </div>
        </div>

        <!-- Main Content -->
        <div class="builder-content">
          <!-- Welcome Message -->
          <div class="message-card welcome">
            <div class="message-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>Hoşgeldin Mesajı</span>
            </div>
            <textarea 
              [(ngModel)]="survey.welcomeMessage"
              placeholder="Ankete katıldığınız için teşekkür ederiz..."
              rows="3"
            ></textarea>
          </div>

          <!-- Questions -->
          <div class="questions-container">
            @for (question of survey.questions; track question.id; let i = $index) {
              <div class="question-card" [class.selected]="selectedQuestion === question.id">
                <div class="question-header">
                  <span class="question-number">{{ i + 1 }}</span>
                  <span class="question-type-label">{{ getQuestionTypeLabel(question.type) }}</span>
                  <div class="question-actions">
                    <button class="q-action" (click)="moveQuestion(i, -1)" [disabled]="i === 0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                    </button>
                    <button class="q-action" (click)="moveQuestion(i, 1)" 
                            [disabled]="i === survey.questions.length - 1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    <button class="q-action duplicate" (click)="duplicateQuestion(question)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                    <button class="q-action delete" (click)="deleteQuestion(question.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div class="question-body">
                  <input 
                    type="text" 
                    class="question-text-input"
                    [(ngModel)]="question.text"
                    placeholder="Soru metnini girin..."
                  />

                  @switch (question.type) {
                    @case ('NPS') {
                      <div class="nps-preview">
                        <div class="nps-scale">
                          @for (n of [0,1,2,3,4,5,6,7,8,9,10]; track n) {
                            <div class="nps-item">{{ n }}</div>
                          }
                        </div>
                        <div class="nps-labels">
                          <input 
                            type="text"
                            [(ngModel)]="question.minLabel"
                            placeholder="Kesinlikle önermem"
                          />
                          <input 
                            type="text"
                            [(ngModel)]="question.maxLabel"
                            placeholder="Kesinlikle öneririm"
                          />
                        </div>
                      </div>
                    }
                    @case ('RATING') {
                      <div class="rating-preview">
                        @for (n of [1,2,3,4,5]; track n) {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        }
                      </div>
                    }
                    @case ('CHOICE') {
                      <div class="options-editor">
                        @for (opt of question.options; track $index; let j = $index) {
                          <div class="option-item">
                            <span class="option-radio"></span>
                            <input 
                              type="text"
                              [(ngModel)]="question.options![j]"
                              placeholder="Seçenek {{ j + 1 }}"
                            />
                            <button class="remove-opt" (click)="removeOption(question, j)">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                        }
                        <button class="add-option-btn" (click)="addOption(question)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Seçenek Ekle
                        </button>
                      </div>
                    }
                    @case ('MULTIPLE') {
                      <div class="options-editor">
                        @for (opt of question.options; track $index; let j = $index) {
                          <div class="option-item">
                            <span class="option-checkbox"></span>
                            <input 
                              type="text"
                              [(ngModel)]="question.options![j]"
                              placeholder="Seçenek {{ j + 1 }}"
                            />
                            <button class="remove-opt" (click)="removeOption(question, j)">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                        }
                        <button class="add-option-btn" (click)="addOption(question)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Seçenek Ekle
                        </button>
                      </div>
                    }
                    @case ('TEXT') {
                      <div class="text-preview">
                        <textarea disabled placeholder="Metin yanıt alanı..."></textarea>
                      </div>
                    }
                  }

                  <label class="required-toggle">
                    <input type="checkbox" [(ngModel)]="question.required" />
                    <span>Zorunlu soru</span>
                  </label>
                </div>
              </div>
            }

            @if (survey.questions.length === 0) {
              <div class="empty-questions">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <h3>Henüz soru eklenmedi</h3>
                <p>Sol panelden soru tiplerini kullanarak sorularınızı ekleyin</p>
              </div>
            }
          </div>

          <!-- Thank You Message -->
          <div class="message-card thankyou">
            <div class="message-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span>Teşekkür Mesajı</span>
            </div>
            <textarea 
              [(ngModel)]="survey.thankYouMessage"
              placeholder="Değerli geri bildiriminiz için teşekkür ederiz!"
              rows="3"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .survey-builder {
      min-height: 100vh;
      background: var(--bg-secondary);
    }

    .builder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: white;
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 100;
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

    .title-section {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .title-input {
      font-size: 1.25rem;
      font-weight: 600;
      border: none;
      padding: 0;
      background: transparent;
      width: 400px;
    }

    .title-input:focus {
      outline: none;
    }

    .desc-input {
      font-size: 0.875rem;
      color: var(--text-secondary);
      border: none;
      padding: 0;
      background: transparent;
      width: 400px;
    }

    .desc-input:focus {
      outline: none;
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
      transition: all 0.2s ease;
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

    /* Layout */
    .builder-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      min-height: calc(100vh - 73px);
    }

    /* Sidebar */
    .builder-sidebar {
      background: white;
      border-right: 1px solid var(--border-color);
      padding: 20px;
      overflow-y: auto;
    }

    .sidebar-section {
      margin-bottom: 24px;
    }

    .sidebar-section h3 {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }

    .type-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .type-option {
      padding: 12px;
      background: var(--bg-secondary);
      border: 2px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }

    .type-option:hover {
      border-color: var(--primary-light);
    }

    .type-option.active {
      border-color: var(--primary-color);
      background: var(--primary-light);
    }

    .type-name {
      display: block;
      font-weight: 500;
      font-size: 0.875rem;
      margin-bottom: 2px;
    }

    .type-desc {
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    .question-types {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .question-type-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .question-type-btn svg {
      width: 20px;
      height: 20px;
      color: var(--text-secondary);
    }

    .question-type-btn span {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .question-type-btn:hover {
      border-color: var(--primary-color);
      background: white;
    }

    .settings-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .setting-toggle {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .setting-toggle input {
      display: none;
    }

    .toggle-switch {
      width: 36px;
      height: 20px;
      background: var(--border-color);
      border-radius: 10px;
      position: relative;
      transition: background 0.2s ease;
    }

    .toggle-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      transition: transform 0.2s ease;
    }

    .setting-toggle input:checked + .toggle-switch {
      background: var(--primary-color);
    }

    .setting-toggle input:checked + .toggle-switch::after {
      transform: translateX(16px);
    }

    .limit-input {
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.875rem;
    }

    /* Main Content */
    .builder-content {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .message-card {
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .message-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      font-weight: 500;
    }

    .message-header svg {
      width: 20px;
      height: 20px;
      color: var(--primary-color);
    }

    .message-card textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 0.875rem;
      resize: vertical;
    }

    /* Question Cards */
    .questions-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }

    .question-card {
      background: white;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      transition: border-color 0.2s ease;
    }

    .question-card.selected {
      border-color: var(--primary-color);
    }

    .question-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
    }

    .question-number {
      width: 28px;
      height: 28px;
      background: var(--primary-color);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .question-type-label {
      flex: 1;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
    }

    .question-actions {
      display: flex;
      gap: 4px;
    }

    .q-action {
      width: 28px;
      height: 28px;
      background: white;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .q-action svg {
      width: 14px;
      height: 14px;
      color: var(--text-tertiary);
    }

    .q-action:hover:not(:disabled) {
      border-color: var(--primary-color);
    }

    .q-action:hover:not(:disabled) svg {
      color: var(--primary-color);
    }

    .q-action:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .q-action.delete:hover svg {
      color: var(--error-color);
    }

    .q-action.delete:hover {
      border-color: var(--error-color);
    }

    .question-body {
      padding: 20px;
    }

    .question-text-input {
      width: 100%;
      font-size: 1rem;
      font-weight: 500;
      border: none;
      border-bottom: 2px solid var(--border-color);
      padding: 8px 0;
      margin-bottom: 20px;
    }

    .question-text-input:focus {
      outline: none;
      border-bottom-color: var(--primary-color);
    }

    /* NPS Preview */
    .nps-preview {
      margin-bottom: 16px;
    }

    .nps-scale {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }

    .nps-item {
      flex: 1;
      height: 44px;
      background: var(--bg-secondary);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      font-size: 0.875rem;
    }

    .nps-labels {
      display: flex;
      justify-content: space-between;
    }

    .nps-labels input {
      width: 45%;
      padding: 8px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.75rem;
      color: var(--text-tertiary);
    }

    /* Rating Preview */
    .rating-preview {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    .rating-preview svg {
      width: 32px;
      height: 32px;
      color: var(--border-color);
    }

    /* Options Editor */
    .options-editor {
      margin-bottom: 16px;
    }

    .option-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }

    .option-radio {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border-color);
      border-radius: 50%;
    }

    .option-checkbox {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border-color);
      border-radius: 4px;
    }

    .option-item input {
      flex: 1;
      padding: 10px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 0.875rem;
    }

    .remove-opt {
      width: 28px;
      height: 28px;
      background: transparent;
      border: none;
      cursor: pointer;
      opacity: 0.5;
    }

    .remove-opt:hover {
      opacity: 1;
    }

    .remove-opt svg {
      width: 16px;
      height: 16px;
      color: var(--error-color);
    }

    .add-option-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: var(--bg-secondary);
      border: 1px dashed var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-left: 30px;
    }

    .add-option-btn svg {
      width: 16px;
      height: 16px;
    }

    .add-option-btn:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    /* Text Preview */
    .text-preview textarea {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      resize: vertical;
      background: var(--bg-secondary);
    }

    .required-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--text-secondary);
      cursor: pointer;
    }

    .required-toggle input {
      accent-color: var(--primary-color);
    }

    .empty-questions {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border: 2px dashed var(--border-color);
      border-radius: 12px;
    }

    .empty-questions svg {
      width: 48px;
      height: 48px;
      color: var(--text-tertiary);
      margin-bottom: 16px;
    }

    .empty-questions h3 {
      margin-bottom: 8px;
    }

    .empty-questions p {
      color: var(--text-tertiary);
      font-size: 0.875rem;
    }

    @media (max-width: 1024px) {
      .builder-layout {
        grid-template-columns: 1fr;
      }

      .builder-sidebar {
        display: none;
      }

      .title-input,
      .desc-input {
        width: 100%;
      }
    }
  `]
})
export class SurveyBuilderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  selectedQuestion: string | null = null;

  survey: Survey = {
    title: '',
    description: '',
    type: 'NPS',
    welcomeMessage: '',
    thankYouMessage: 'Değerli geri bildiriminiz için teşekkür ederiz!',
    questions: [],
    settings: {
      allowAnonymous: true,
      showProgress: true,
      randomizeQuestions: false,
      limitResponses: false
    }
  };

  surveyTypes: Array<{value: 'NPS' | 'CSAT' | 'CES' | 'CUSTOM', label: string, description: string}> = [
    { value: 'NPS', label: 'NPS', description: 'Net Promoter Score' },
    { value: 'CSAT', label: 'CSAT', description: 'Müşteri Memnuniyeti' },
    { value: 'CES', label: 'CES', description: 'Müşteri Eforu Skoru' },
    { value: 'CUSTOM', label: 'Özel', description: 'Özelleştirilmiş anket' }
  ];

  questionTypes = [
    { type: 'NPS', label: 'NPS (0-10)' },
    { type: 'RATING', label: 'Yıldız Derecelendirme' },
    { type: 'CHOICE', label: 'Tek Seçimli' },
    { type: 'MULTIPLE', label: 'Çok Seçimli' },
    { type: 'TEXT', label: 'Açık Uçlu' },
    { type: 'MATRIX', label: 'Matris' }
  ];

  ngOnInit(): void {
    const surveyId = this.route.snapshot.paramMap.get('id');
    if (surveyId) {
      this.loadSurvey(surveyId);
    }
  }

  loadSurvey(id: string): void {
    // Mock load
    console.log('Loading survey:', id);
  }

  setSurveyType(type: 'NPS' | 'CSAT' | 'CES' | 'CUSTOM'): void {
    this.survey.type = type;
    
    // Add default question based on type
    if (this.survey.questions.length === 0) {
      if (type === 'NPS') {
        this.addQuestion('NPS');
      } else if (type === 'CSAT' || type === 'CES') {
        this.addQuestion('RATING');
      }
    }
  }

  addQuestion(type: string): void {
    const question: Question = {
      id: `q-${Date.now()}`,
      type: type as Question['type'],
      text: '',
      required: true,
      minLabel: type === 'NPS' ? 'Kesinlikle önermem' : undefined,
      maxLabel: type === 'NPS' ? 'Kesinlikle öneririm' : undefined,
      options: ['CHOICE', 'MULTIPLE'].includes(type) ? ['', ''] : undefined
    };

    this.survey.questions.push(question);
  }

  getQuestionTypeLabel(type: string): string {
    const found = this.questionTypes.find(t => t.type === type);
    return found?.label || type;
  }

  moveQuestion(index: number, direction: number): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.survey.questions.length) return;

    const questions = [...this.survey.questions];
    [questions[index], questions[newIndex]] = [questions[newIndex], questions[index]];
    this.survey.questions = questions;
  }

  duplicateQuestion(question: Question): void {
    const copy: Question = {
      ...question,
      id: `q-${Date.now()}`,
      options: question.options ? [...question.options] : undefined
    };
    this.survey.questions.push(copy);
  }

  deleteQuestion(id: string): void {
    this.survey.questions = this.survey.questions.filter(q => q.id !== id);
  }

  addOption(question: Question): void {
    if (!question.options) {
      question.options = [];
    }
    question.options.push('');
  }

  removeOption(question: Question, index: number): void {
    if (question.options && question.options.length > 2) {
      question.options.splice(index, 1);
    }
  }

  preview(): void {
    console.log('Preview survey');
  }

  saveSurvey(): void {
    console.log('Save survey:', this.survey);
    this.router.navigate(['/surveys']);
  }

  goBack(): void {
    this.router.navigate(['/surveys']);
  }
}
