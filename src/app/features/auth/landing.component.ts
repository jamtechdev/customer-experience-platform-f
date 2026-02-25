import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslationService, Language } from '../../core/services/translation.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="landing-container">
      <!-- Navigation -->
      <nav class="landing-nav">
        <div class="nav-container">
          <div class="logo-section">
            <div class="logo">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="24" fill="#059669"/>
                <path d="M16 32V20L24 14L32 20V32H26V26H22V32H16Z" fill="white"/>
                <circle cx="24" cy="22" r="3" fill="white"/>
              </svg>
            </div>
            <span class="logo-text">Sentimenter CX</span>
          </div>
          <div class="nav-actions">
            <div class="language-switcher">
              <button 
                class="lang-icon-btn"
                (click)="toggleLanguageMenu()"
                [attr.aria-expanded]="showLanguageMenu()"
                title="Change Language"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </button>
              @if (showLanguageMenu()) {
                <div class="language-menu">
                  <button 
                    class="lang-option" 
                    [class.active]="currentLang() === 'tr'"
                    (click)="switchLanguage('tr'); showLanguageMenu.set(false)"
                  >
                    <span class="lang-flag">🇹🇷</span>
                    <span class="lang-name">Türkçe</span>
                    @if (currentLang() === 'tr') {
                      <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    }
                  </button>
                  <button 
                    class="lang-option" 
                    [class.active]="currentLang() === 'en'"
                    (click)="switchLanguage('en'); showLanguageMenu.set(false)"
                  >
                    <span class="lang-flag">🇬🇧</span>
                    <span class="lang-name">English</span>
                    @if (currentLang() === 'en') {
                      <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    }
                  </button>
                </div>
              }
            </div>
            <a routerLink="/login" class="btn-nav">{{ t('login') }}</a>
            <a routerLink="/signup" class="btn-nav btn-primary">{{ t('signup') }}</a>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">
            <span>✨ Müşteri Deneyimi Platformu</span>
          </div>
          <h1 class="hero-title">
            {{ t('landingTitle') }}
            <span class="gradient-text">{{ t('landingSubtitle') }}</span>
          </h1>
          <p class="hero-description">
            {{ t('landingDescription') }}
          </p>
          <div class="hero-actions">
            <a routerLink="/signup" class="btn-hero btn-primary">
              <span>{{ t('getStarted') }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a routerLink="/login" class="btn-hero btn-secondary">
              <span>{{ t('login') }}</span>
            </a>
          </div>
          <div class="hero-stats">
            <div class="stat-item">
              <div class="stat-value">100%</div>
              <div class="stat-label">{{ t('offline') }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">24/7</div>
              <div class="stat-label">{{ t('analysis') }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">AI</div>
              <div class="stat-label">{{ t('aiPowered') }}</div>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="dashboard-preview">
            <div class="preview-card">
              <div class="card-header">
                <div class="header-title">Dashboard Preview</div>
                <div class="header-badge">Live Data</div>
              </div>
              <div class="card-content">
                <!-- Sentiment Chart -->
                <div class="chart-container">
                  <div class="chart-header">
                    <span class="chart-title">Sentiment Analysis</span>
                    <span class="chart-period">Last 7 Days</span>
                  </div>
                  <div class="chart-wrapper">
                    <svg viewBox="0 0 300 120" class="sentiment-chart">
                      <defs>
                        <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.3" />
                          <stop offset="100%" style="stop-color:#10b981;stop-opacity:0" />
                        </linearGradient>
                      </defs>
                      <polyline
                        points="10,100 50,85 90,70 130,60 170,55 210,50 250,45 290,40"
                        fill="url(#sentimentGradient)"
                        stroke="#10b981"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <polyline
                        points="10,100 50,85 90,70 130,60 170,55 210,50 250,45 290,40"
                        fill="none"
                        stroke="#10b981"
                        stroke-width="3"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <circle cx="290" cy="40" r="4" fill="#10b981" />
                    </svg>
                  </div>
                </div>
                
                <!-- Metrics Grid -->
                <div class="metrics-grid">
                  <div class="metric-box">
                    <div class="metric-icon positive">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                      </svg>
                    </div>
                    <div class="metric-content">
                      <div class="metric-value">+12.5%</div>
                      <div class="metric-label">NPS Score</div>
                    </div>
                  </div>
                  <div class="metric-box">
                    <div class="metric-icon success">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                    </div>
                    <div class="metric-content">
                      <div class="metric-value">85%</div>
                      <div class="metric-label">Satisfaction</div>
                    </div>
                  </div>
                  <div class="metric-box">
                    <div class="metric-icon warning">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                    </div>
                    <div class="metric-content">
                      <div class="metric-value">1,234</div>
                      <div class="metric-label">Feedback</div>
                    </div>
                  </div>
                  <div class="metric-box">
                    <div class="metric-icon info">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    </div>
                    <div class="metric-content">
                      <div class="metric-value">24/7</div>
                      <div class="metric-label">Analysis</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats Section with Charts -->
      <section class="stats-section">
        <div class="section-container">
          <h2 class="section-title">Platform Insights</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-chart">
                <svg viewBox="0 0 200 100" class="line-chart">
                  <defs>
                    <linearGradient id="chartGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.3" />
                      <stop offset="100%" style="stop-color:#10b981;stop-opacity:0" />
                    </linearGradient>
                  </defs>
                  <polyline
                    points="10,80 40,70 70,60 100,50 130,45 160,40 190,35"
                    fill="url(#chartGradient1)"
                    stroke="#10b981"
                    stroke-width="3"
                    stroke-linecap="round"
                  />
                  <polyline
                    points="10,80 40,70 70,60 100,50 130,45 160,40 190,35"
                    fill="none"
                    stroke="#10b981"
                    stroke-width="3"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <div class="stat-info">
                <div class="stat-number">+24%</div>
                <div class="stat-text">Customer Satisfaction</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-chart">
                <svg viewBox="0 0 200 100" class="bar-chart">
                  <rect x="20" y="60" width="30" height="30" fill="#3b82f6" rx="4"/>
                  <rect x="60" y="50" width="30" height="40" fill="#3b82f6" rx="4"/>
                  <rect x="100" y="40" width="30" height="50" fill="#3b82f6" rx="4"/>
                  <rect x="140" y="30" width="30" height="60" fill="#3b82f6" rx="4"/>
                </svg>
              </div>
              <div class="stat-info">
                <div class="stat-number">1,234</div>
                <div class="stat-text">Feedback Analyzed</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-chart">
                <svg viewBox="0 0 200 100" class="pie-chart">
                  <circle cx="100" cy="50" r="35" fill="none" stroke="#e5e7eb" stroke-width="8"/>
                  <circle cx="100" cy="50" r="35" fill="none" stroke="#10b981" stroke-width="8" 
                    stroke-dasharray="220 110" stroke-dashoffset="0" transform="rotate(-90 100 50)"/>
                </svg>
              </div>
              <div class="stat-info">
                <div class="stat-number">85%</div>
                <div class="stat-text">Positive Sentiment</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features-section">
        <div class="section-container">
          <h2 class="section-title">{{ t('features') }}</h2>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3>{{ t('sentimentAnalysis') }}</h3>
              <p>{{ t('sentimentAnalysisDesc') }}</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <h3>{{ t('npsAnalysis') }}</h3>
              <p>{{ t('npsAnalysisDesc') }}</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h3>{{ t('rootCauseAnalysis') }}</h3>
              <p>{{ t('rootCauseAnalysisDesc') }}</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>{{ t('competitorAnalysis') }}</h3>
              <p>{{ t('competitorAnalysisDesc') }}</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h3>{{ t('detailedReports') }}</h3>
              <p>{{ t('detailedReportsDesc') }}</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </div>
              <h3>{{ t('customerJourney') }}</h3>
              <p>{{ t('customerJourneyDesc') }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="cta-container">
          <h2>{{ t('getStarted') }}</h2>
          <p>{{ t('landingDescription') }}</p>
          <div class="cta-actions">
            <a routerLink="/signup" class="btn-cta btn-primary">{{ t('getStarted') }}</a>
            <a routerLink="/login" class="btn-cta btn-secondary">{{ t('login') }}</a>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <div class="footer-container">
          <div class="footer-content">
            <div class="footer-section">
              <h4>Sentimenter CX</h4>
              <p>Albaraka Türk Müşteri Deneyimi Platformu</p>
            </div>
            <div class="footer-section">
              <h4>Özellikler</h4>
              <ul>
                <li><a href="#features">Duygu Analizi</a></li>
                <li><a href="#features">NPS Analizi</a></li>
                <li><a href="#features">Raporlar</a></li>
              </ul>
            </div>
            <div class="footer-section">
              <h4>Destek</h4>
              <ul>
                <li><a href="#">Yardım Merkezi</a></li>
                <li><a href="#">İletişim</a></li>
                <li><a href="#">Dokümantasyon</a></li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <p>&copy; {{ currentYear }} {{ t('copyright') }}</p>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .landing-container {
      min-height: 100vh;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    }

    /* Navigation */
    .landing-nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid #e5e7eb;
      padding: 16px 0;
    }

    .nav-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo {
      width: 40px;
      height: 40px;
    }

    .logo svg {
      width: 100%;
      height: 100%;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
    }

    .nav-actions {
      display: flex;
      gap: 12px;
    }

    .btn-nav {
      padding: 10px 20px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .btn-nav:not(.btn-primary) {
      color: #4b5563;
      background: transparent;
    }

    .btn-nav:not(.btn-primary):hover {
      color: #059669;
    }

    .btn-nav.btn-primary {
      background: linear-gradient(135deg, #059669, #047857);
      color: white;
      border: none;
    }

    .btn-nav.btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
    }

    .language-switcher {
      position: relative;
    }

    .lang-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
      border: 1px solid #e5e7eb;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s ease;
    }

    .lang-icon-btn:hover {
      color: #059669;
      border-color: #059669;
      background: #f0fdf4;
    }

    .lang-icon-btn svg {
      width: 20px;
      height: 20px;
    }

    .language-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      min-width: 160px;
      z-index: 1000;
      overflow: hidden;
    }

    .lang-option {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      border: none;
      background: white;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.875rem;
      color: #1f2937;
    }

    .lang-option:hover {
      background: #f9fafb;
    }

    .lang-option.active {
      background: #f0fdf4;
      color: #059669;
      font-weight: 500;
    }

    .lang-flag {
      font-size: 1.25rem;
      line-height: 1;
    }

    .lang-name {
      flex: 1;
    }

    .check-icon {
      width: 16px;
      height: 16px;
      color: #059669;
    }

    /* Hero Section */
    .hero-section {
      max-width: 1200px;
      margin: 0 auto;
      padding: 80px 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: center;
    }

    .hero-badge {
      display: inline-block;
      padding: 8px 16px;
      background: #ecfdf5;
      color: #059669;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 24px;
    }

    .hero-title {
      font-size: 3.5rem;
      font-weight: 800;
      line-height: 1.1;
      color: #1f2937;
      margin-bottom: 24px;
    }

    .gradient-text {
      background: linear-gradient(135deg, #059669, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-description {
      font-size: 1.125rem;
      color: #6b7280;
      line-height: 1.7;
      margin-bottom: 32px;
      max-width: 540px;
    }

    .hero-actions {
      display: flex;
      gap: 16px;
      margin-bottom: 48px;
    }

    .btn-hero {
      padding: 16px 32px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1rem;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .btn-hero.btn-primary {
      background: linear-gradient(135deg, #059669, #047857);
      color: white;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
    }

    .btn-hero.btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4);
    }

    .btn-hero.btn-secondary {
      background: white;
      color: #059669;
      border: 2px solid #059669;
    }

    .btn-hero.btn-secondary:hover {
      background: #f0fdf4;
    }

    .btn-hero svg {
      width: 20px;
      height: 20px;
    }

    .hero-stats {
      display: flex;
      gap: 48px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #059669;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .hero-visual {
      position: relative;
    }

    .dashboard-preview {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);
      transition: transform 0.3s ease;
    }

    .dashboard-preview:hover {
      transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
    }

    .preview-card {
      padding: 0;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
      border-bottom: 1px solid #d1fae5;
    }

    .header-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #059669;
    }

    .header-badge {
      padding: 4px 12px;
      background: #10b981;
      color: white;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .card-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .chart-container {
      background: #f9fafb;
      border-radius: 12px;
      padding: 16px;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .chart-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #1f2937;
    }

    .chart-period {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .chart-wrapper {
      height: 120px;
      width: 100%;
    }

    .sentiment-chart {
      width: 100%;
      height: 100%;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }

    .metric-box {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    .metric-box:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .metric-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .metric-icon svg {
      width: 20px;
      height: 20px;
    }

    .metric-icon.positive {
      background: #dbeafe;
      color: #3b82f6;
    }

    .metric-icon.success {
      background: #d1fae5;
      color: #10b981;
    }

    .metric-icon.warning {
      background: #fef3c7;
      color: #f59e0b;
    }

    .metric-icon.info {
      background: #e0e7ff;
      color: #6366f1;
    }

    .metric-content {
      display: flex;
      flex-direction: column;
    }

    .metric-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1f2937;
      line-height: 1.2;
    }

    .metric-label {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 2px;
    }

    /* Stats Section */
    .stats-section {
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
      padding: 80px 24px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 32px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
      border: 1px solid #e5e7eb;
    }

    .stat-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    .stat-chart {
      height: 120px;
      width: 100%;
      margin-bottom: 20px;
    }

    .stat-chart svg {
      width: 100%;
      height: 100%;
    }

    .line-chart, .bar-chart, .pie-chart {
      width: 100%;
      height: 100%;
    }

    .stat-info {
      text-align: center;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      color: #059669;
      margin-bottom: 8px;
    }

    .stat-text {
      font-size: 0.875rem;
      color: #6b7280;
      font-weight: 500;
    }

    /* Features Section */
    .features-section {
      background: white;
      padding: 100px 24px;
    }

    .section-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-title {
      text-align: center;
      font-size: 2.5rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 64px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 32px;
    }

    .feature-card {
      padding: 32px;
      background: #f9fafb;
      border-radius: 12px;
      transition: all 0.3s ease;
      border: 1px solid #e5e7eb;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
      border-color: #059669;
    }

    .feature-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #ecfdf5, #d1fae5);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      color: #059669;
    }

    .feature-icon svg {
      width: 24px;
      height: 24px;
    }

    .feature-card h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 12px;
    }

    .feature-card p {
      color: #6b7280;
      line-height: 1.6;
    }

    /* CTA Section */
    .cta-section {
      background: linear-gradient(135deg, #059669, #047857);
      padding: 80px 24px;
      text-align: center;
    }

    .cta-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .cta-section h2 {
      font-size: 2.5rem;
      font-weight: 700;
      color: white;
      margin-bottom: 16px;
    }

    .cta-section p {
      font-size: 1.25rem;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 32px;
    }

    .cta-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
    }

    .btn-cta {
      padding: 16px 32px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 1rem;
      transition: all 0.2s ease;
    }

    .btn-cta.btn-primary {
      background: white;
      color: #059669;
    }

    .btn-cta.btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
    }

    .btn-cta.btn-secondary {
      background: transparent;
      color: white;
      border: 2px solid white;
    }

    .btn-cta.btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    /* Footer */
    .landing-footer {
      background: #1f2937;
      color: #9ca3af;
      padding: 60px 24px 24px;
    }

    .footer-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .footer-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 40px;
      margin-bottom: 40px;
    }

    .footer-section h4 {
      color: white;
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .footer-section p {
      font-size: 0.875rem;
      line-height: 1.6;
    }

    .footer-section ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .footer-section ul li {
      margin-bottom: 12px;
    }

    .footer-section ul li a {
      color: #9ca3af;
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 0.2s ease;
    }

    .footer-section ul li a:hover {
      color: white;
    }

    .footer-bottom {
      padding-top: 24px;
      border-top: 1px solid #374151;
      text-align: center;
      font-size: 0.875rem;
    }

    @media (max-width: 968px) {
      .hero-section {
        grid-template-columns: 1fr;
        text-align: center;
      }

      .hero-stats {
        justify-content: center;
      }

      .hero-title {
        font-size: 2.5rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .nav-actions {
        gap: 8px;
      }

      .btn-nav {
        padding: 8px 16px;
        font-size: 0.8125rem;
      }

      .hero-section {
        padding: 40px 16px;
      }

      .hero-title {
        font-size: 2rem;
      }

      .hero-actions {
        flex-direction: column;
      }

      .btn-hero {
        width: 100%;
        justify-content: center;
      }

      .hero-stats {
        flex-direction: column;
        gap: 24px;
      }
    }
  `]
})
export class LandingComponent {
  private translation = inject(TranslationService);
  
  currentYear = new Date().getFullYear();
  
  // Translation helper
  t = (key: string) => this.translation.translate(key);
  
  // Language switcher
  currentLang = this.translation.currentLang;
  showLanguageMenu = signal(false);
  
  switchLanguage(lang: Language): void {
    this.translation.setLanguage(lang);
    this.showLanguageMenu.set(false);
  }
  
  toggleLanguageMenu(): void {
    this.showLanguageMenu.set(!this.showLanguageMenu());
  }
}
