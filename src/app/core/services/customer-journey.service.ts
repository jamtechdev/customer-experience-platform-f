import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  CustomerJourney, 
  JourneyStage, 
  Touchpoint, 
  PainPoint, 
  Opportunity,
  ActionPlan,
  ApiResponse, 
  PaginationParams 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class CustomerJourneyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/customer-journey';

  // Journey CRUD
  getJourneys(pagination?: PaginationParams): Observable<ApiResponse<CustomerJourney[]>> {
    let params = new HttpParams();
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('pageSize', pagination.pageSize.toString());
    }
    return this.http.get<ApiResponse<CustomerJourney[]>>(this.baseUrl, { params });
  }

  getJourneyById(id: string): Observable<ApiResponse<CustomerJourney>> {
    return this.http.get<ApiResponse<CustomerJourney>>(`${this.baseUrl}/${id}`);
  }

  createJourney(journey: Partial<CustomerJourney>): Observable<ApiResponse<CustomerJourney>> {
    return this.http.post<ApiResponse<CustomerJourney>>(this.baseUrl, journey);
  }

  updateJourney(id: string, journey: Partial<CustomerJourney>): Observable<ApiResponse<CustomerJourney>> {
    return this.http.put<ApiResponse<CustomerJourney>>(`${this.baseUrl}/${id}`, journey);
  }

  deleteJourney(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }

  publishJourney(id: string): Observable<ApiResponse<CustomerJourney>> {
    return this.http.post<ApiResponse<CustomerJourney>>(`${this.baseUrl}/${id}/publish`, {});
  }

  // Journey Analysis - matches backend /api/journey routes
  getStages(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/stages`);
  }

  analyzeJourney(companyId?: number): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/analysis`, { params });
  }

  getJourneyTrends(companyId?: number, period?: 'day' | 'week' | 'month'): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (companyId) params = params.set('companyId', companyId.toString());
    if (period) params = params.set('period', period);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/trends`, { params });
  }

  // Stages
  addStage(journeyId: string, stage: Partial<JourneyStage>): Observable<ApiResponse<JourneyStage>> {
    return this.http.post<ApiResponse<JourneyStage>>(`${this.baseUrl}/${journeyId}/stages`, stage);
  }

  updateStage(journeyId: string, stageId: string, stage: Partial<JourneyStage>): Observable<ApiResponse<JourneyStage>> {
    return this.http.put<ApiResponse<JourneyStage>>(`${this.baseUrl}/${journeyId}/stages/${stageId}`, stage);
  }

  deleteStage(journeyId: string, stageId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${journeyId}/stages/${stageId}`);
  }

  // Touchpoints
  getTouchpoints(journeyId: string): Observable<ApiResponse<Touchpoint[]>> {
    return this.http.get<ApiResponse<Touchpoint[]>>(`${this.baseUrl}/${journeyId}/touchpoints`);
  }

  addTouchpoint(journeyId: string, touchpoint: Partial<Touchpoint>): Observable<ApiResponse<Touchpoint>> {
    return this.http.post<ApiResponse<Touchpoint>>(`${this.baseUrl}/${journeyId}/touchpoints`, touchpoint);
  }

  updateTouchpoint(journeyId: string, touchpointId: string, touchpoint: Partial<Touchpoint>): Observable<ApiResponse<Touchpoint>> {
    return this.http.put<ApiResponse<Touchpoint>>(`${this.baseUrl}/${journeyId}/touchpoints/${touchpointId}`, touchpoint);
  }

  markAsWeakLink(journeyId: string, touchpointId: string, isWeakLink: boolean): Observable<ApiResponse<Touchpoint>> {
    return this.http.patch<ApiResponse<Touchpoint>>(`${this.baseUrl}/${journeyId}/touchpoints/${touchpointId}/weak-link`, { isWeakLink });
  }

  // Pain Points
  getPainPoints(journeyId: string): Observable<ApiResponse<PainPoint[]>> {
    return this.http.get<ApiResponse<PainPoint[]>>(`${this.baseUrl}/${journeyId}/pain-points`);
  }

  addPainPoint(journeyId: string, painPoint: Partial<PainPoint>): Observable<ApiResponse<PainPoint>> {
    return this.http.post<ApiResponse<PainPoint>>(`${this.baseUrl}/${journeyId}/pain-points`, painPoint);
  }

  updatePainPoint(journeyId: string, painPointId: string, painPoint: Partial<PainPoint>): Observable<ApiResponse<PainPoint>> {
    return this.http.put<ApiResponse<PainPoint>>(`${this.baseUrl}/${journeyId}/pain-points/${painPointId}`, painPoint);
  }

  // Opportunities
  getOpportunities(journeyId: string): Observable<ApiResponse<Opportunity[]>> {
    return this.http.get<ApiResponse<Opportunity[]>>(`${this.baseUrl}/${journeyId}/opportunities`);
  }

  addOpportunity(journeyId: string, opportunity: Partial<Opportunity>): Observable<ApiResponse<Opportunity>> {
    return this.http.post<ApiResponse<Opportunity>>(`${this.baseUrl}/${journeyId}/opportunities`, opportunity);
  }

  updateOpportunity(journeyId: string, opportunityId: string, opportunity: Partial<Opportunity>): Observable<ApiResponse<Opportunity>> {
    return this.http.put<ApiResponse<Opportunity>>(`${this.baseUrl}/${journeyId}/opportunities/${opportunityId}`, opportunity);
  }

  // Action Plans
  getActionPlans(journeyId: string): Observable<ApiResponse<ActionPlan[]>> {
    return this.http.get<ApiResponse<ActionPlan[]>>(`${this.baseUrl}/${journeyId}/action-plans`);
  }

  createActionPlan(journeyId: string, actionPlan: Partial<ActionPlan>): Observable<ApiResponse<ActionPlan>> {
    return this.http.post<ApiResponse<ActionPlan>>(`${this.baseUrl}/${journeyId}/action-plans`, actionPlan);
  }

  updateActionPlan(journeyId: string, planId: string, actionPlan: Partial<ActionPlan>): Observable<ApiResponse<ActionPlan>> {
    return this.http.put<ApiResponse<ActionPlan>>(`${this.baseUrl}/${journeyId}/action-plans/${planId}`, actionPlan);
  }

  // Export
  exportJourneyMap(id: string, format: 'pdf' | 'png' = 'pdf'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/export`, { 
      params: { format },
      responseType: 'blob' 
    });
  }

  // Analytics
  getJourneyAnalytics(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/${id}/analytics`);
  }
}
