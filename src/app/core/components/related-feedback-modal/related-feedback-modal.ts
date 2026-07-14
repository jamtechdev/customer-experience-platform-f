import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
} from '@angular/core';
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
  rootCauseMatchReason?: string | null;
  retweetCount?: number;
  memberIds?: number[];
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
export class RelatedFeedbackModal implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() open = false;
  @Input() loading = false;
  @Input() title = '';
  @Input() rows: RelatedFeedbackRow[] = [];
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() total = 0;
  /** Pre-dedupe volume (exact/near-duplicate retweets). When > unique total, shown in footer. */
  @Input() originalCount: number | null = null;
  @Input() uniqueCount: number | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<number>();

  private readonly isBrowser: boolean;
  private originalParent: Node | null = null;
  private originalNextSibling: Node | null = null;
  private movedToBody = false;
  private pendingPortal = false;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    @Inject(DOCUMENT) private readonly documentRef: Document,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open']) return;
    if (this.open) {
      this.pendingPortal = true;
    } else {
      this.pendingPortal = false;
      this.restoreHostLocation();
    }
  }

  ngAfterViewChecked(): void {
    if (!this.pendingPortal || !this.open) return;
    this.pendingPortal = false;
    this.ensureHostOnBody();
  }

  ngOnDestroy(): void {
    this.pendingPortal = false;
    this.restoreHostLocation();
  }

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

  get volumeHint(): string {
    const original = Number(this.originalCount);
    const unique = Number(this.uniqueCount ?? this.total);
    if (!Number.isFinite(original) || original <= 0 || !Number.isFinite(unique)) return '';
    if (original <= unique) return '';
    return `${original} mentions · ${unique} unique`;
  }

  close(): void {
    this.closed.emit();
  }

  private ensureHostOnBody(): void {
    if (!this.isBrowser) return;
    const host = this.elementRef.nativeElement;
    if (host.parentElement === this.documentRef.body) {
      this.movedToBody = true;
      return;
    }
    this.originalParent = host.parentNode;
    this.originalNextSibling = host.nextSibling;
    this.documentRef.body.appendChild(host);
    this.movedToBody = true;
  }

  private restoreHostLocation(): void {
    if (!this.isBrowser || !this.movedToBody || !this.originalParent) return;
    const host = this.elementRef.nativeElement;
    if (this.originalNextSibling && this.originalNextSibling.parentNode === this.originalParent) {
      this.originalParent.insertBefore(host, this.originalNextSibling);
    } else {
      this.originalParent.appendChild(host);
    }
    this.movedToBody = false;
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

  repairTurkishText(value: string | null | undefined): string {
    const text = String(value || '');
    if (!text.includes('?')) return text;
    return text
      .replace(/uygulamas\?/gi, 'uygulaması')
      .replace(/\?ifre/gi, 'şifre')
      .replace(/i\?lem/gi, 'işlem')
      .replace(/s\?rekli/gi, 'sürekli')
      .replace(/m\?\?teri/gi, 'müşteri')
      .replace(/\?ikayet/gi, 'şikayet')
      .replace(/\?r[üu]n/gi, 'ürün')
      .replace(/g\?r/gi, 'gör')
      .replace(/d\?n/gi, 'dön')
      .replace(/y\?net/gi, 'yönet')
      .replace(/\?al\?\?m/gi, 'çalışm')
      .replace(/yapam\?\s*yorum/gi, 'yapamıyorum')
      .replace(/alam\?\s*yorum/gi, 'alamıyorum')
      .replace(/edem\?\s*yorum/gi, 'edemiyorum')
      .replace(/olam\?\s*yorum/gi, 'olamıyorum');
  }

  originalText(row: RelatedFeedbackRow): string {
    return this.repairTurkishText(row.referenceContent || row.content || '');
  }

  summaryText(row: RelatedFeedbackRow): string {
    return this.repairTurkishText(row.contentSummary || row.translatedContent || '').trim();
  }

  summaryMissingText(): string {
    return 'Not available';
  }

  whyRelatedText(row: RelatedFeedbackRow): string {
    const raw = String(row.rootCauseMatchReason || row.relevanceReason || '').trim();
    if (raw && !/keyword\s*overlap|linked by theme keyword|theme keyword/i.test(raw)) {
      return raw;
    }
    const fallback = String(row.journeyStage || '').trim();
    if (fallback) {
      return `Related by shared ${fallback.toLowerCase()} journey context and customer issue intent.`;
    }
    return 'Related by shared customer-experience issue and journey context.';
  }
}
