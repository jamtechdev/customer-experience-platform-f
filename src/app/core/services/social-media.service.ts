import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';
import { environment } from '../../../environments/environment';

export interface MethodologyStep {
  step: number;
  name: string;
  description: string;
  metrics: string[];
  implementation: string;
}

export interface Methodology {
  name: string;
  version: string;
  description: string;
  steps: MethodologyStep[];
  dataSources: string[];
  analysisTechniques: string[];
  outputDeliverables: string[];
}

export interface VolumeAnalysis {
  totalMentions: number;
  mentionsPerPlatform: Record<string, number>;
  trends: Array<{ date: string; count: number }>;
}

export interface SentimentDistribution {
  positive: number;
  negative: number;
  neutral: number;
  sentimentIndex: number;
  channelComparison: Record<string, { positive: number; negative: number; neutral: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class SocialMediaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl ? `${environment.apiUrl.replace(/\/$/, '')}/social-media` : '/api/social-media';

  getMethodology(): Observable<ApiResponse<Methodology>> {
    return this.http.get<ApiResponse<Methodology>>(`${this.baseUrl}/methodology`);
  }

  getVolume(
    companyId: number,
    startDate?: Date,
    endDate?: Date
  ): Observable<ApiResponse<VolumeAnalysis>> {
    let params = new HttpParams().set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    return this.http.get<ApiResponse<VolumeAnalysis>>(`${this.baseUrl}/volume`, { params });
  }

  getSentimentDistribution(
    companyId: number,
    startDate?: Date,
    endDate?: Date
  ): Observable<ApiResponse<SentimentDistribution>> {
    let params = new HttpParams().set('companyId', companyId.toString());
    if (startDate) params = params.set('startDate', startDate.toISOString());
    if (endDate) params = params.set('endDate', endDate.toISOString());
    return this.http.get<ApiResponse<SentimentDistribution>>(`${this.baseUrl}/sentiment-distribution`, { params });
  }
}
