import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface RelatedFeedbackRow {
  id: number;
  content: string;
  referenceContent?: string;
  translatedContent?: string | null;
  contentSummary?: string | null;
  relevanceReason?: string | null;
  source?: string | null;
  author?: string | null;
  date?: string | Date | null;
  sentiment?: string | null;
  score?: number | null;
  journeyStage?: string | null;
  isRelevant?: boolean | null;
}

@Component({
  selector: 'app-related-feedback-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './related-feedback-modal.html',
  styleUrl: './related-feedback-modal.css',
})
export class RelatedFeedbackModal {
  @Input() open = false;
  @Input() loading = false;
  @Input() title = '';
  @Input() rows: RelatedFeedbackRow[] = [];
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() total = 0;

  @Output() closed = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<number>();

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.open) return;
    event.preventDefault();
    this.close();
  }

  get totalPages(): number {
    return this.total > 0 ? Math.ceil(this.total / Math.max(1, this.pageSize)) : 0;
  }

  get rangeStart(): number {
    if (!this.total || !this.rows.length) return 0;
    return (Math.max(1, this.page) - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    if (!this.total || !this.rows.length) return 0;
    return Math.min(this.total, this.rangeStart + this.rows.length - 1);
  }

  close(): void {
    this.closed.emit();
  }

  goPrev(): void {
    if (this.page <= 1 || this.loading) return;
    this.pageChange.emit(this.page - 1);
  }

  goNext(): void {
    if (!this.totalPages || this.page >= this.totalPages || this.loading) return;
    this.pageChange.emit(this.page + 1);
  }

  displayDate(value: string | Date | null | undefined): string {
    if (!value) return '-';
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
  }

  originalText(row: RelatedFeedbackRow): string {
    return String(row.referenceContent || row.content || '');
  }

  translationText(row: RelatedFeedbackRow): string {
    return String(row.translatedContent || row.contentSummary || '').trim();
  }

  translationMissingText(): string {
    return 'Not available';
  }
}
