import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models';

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

@Injectable({
  providedIn: 'root'
})
export class SocialMediaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/social-media';

  getMethodology(): Observable<ApiResponse<Methodology>> {
    return this.http.get<ApiResponse<Methodology>>(`${this.baseUrl}/methodology`);
  }
}
