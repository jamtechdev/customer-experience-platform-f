import { Component, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  CSVService,
  CSVPreview,
  type DateFormatHint,
  SystemField,
  type RowValidationError,
  ValidateMappingsResult,
} from '../../../core/services/csv.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-csv-mapping',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './csv-mapping.html',
  styleUrl: './csv-mapping.css',
})
export class CsvMapping implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private csvService = inject(CSVService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  importId = signal<number | null>(null);
  loading = signal(true);
  preview = signal<CSVPreview | null>(null);
  validating = signal(false);
  importStarted = signal(false);

  dataType = signal<'social_media' | 'app_review' | 'nps_survey' | 'complaint'>('social_media');
  validation = signal<ValidateMappingsResult | null>(null);
  dateFormat = signal<DateFormatHint>('auto');

  importError = signal<{
    message: string;
    totalIssues?: number;
    guidance?: string[];
    errors: RowValidationError[];
  } | null>(null);

  // systemField -> csvHeader (or null)
  fieldSelections = signal<Record<string, string | null>>({});

  companyId = computed(() => this.authService.currentUser()?.settings?.companyId ?? 1);

  systemFieldsSorted = computed<SystemField[]>(() => {
    const previewFields = this.preview()?.systemFields ?? [];
    const must = new Set(this.requiredSystemFields());

    // When backend preview can't confidently detect type, `previewFields` can be incomplete.
    // Ensure required system fields are always shown for the currently selected `dataType`.
    const inferredRequired: SystemField[] = [];
    for (const name of must) {
      if (previewFields.some((f) => f.name === name)) continue;
      inferredRequired.push({
        name,
        type:
          name === 'date' ? 'date' : name === 'score' ? 'number' : 'string',
        required: true,
      });
    }

    const fields = [...previewFields, ...inferredRequired];
    const req = fields
      .filter((f) => f.required || must.has(f.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    const opt = fields
      .filter((f) => !f.required && !must.has(f.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...req, ...opt];
  });

  headers = computed(() => this.preview()?.headers ?? []);

  requiredSystemFields = computed<string[]>(() =>
    this.dataType() === 'nps_survey' ? ['score', 'date'] : ['content', 'date', 'source']
  );

  // Ensure required system fields always exist in `fieldSelections`.
  // Keep this outside lifecycle hooks so `effect()` is created within Angular's injection context.
  private readonly ensureRequiredFieldsEffect = effect(() => {
    const required = this.requiredSystemFields();
    const current = untracked(() => this.fieldSelections());
    let changed = false;
    const next = { ...current };

    for (const r of required) {
      if (next[r] === undefined) {
        next[r] = null;
        changed = true;
      }
    }

    if (changed) this.fieldSelections.set(next);
  });

  isRequiredField(name: string): boolean {
    return this.requiredSystemFields().includes(name);
  }

  ngOnInit(): void {
    const idRaw = this.route.snapshot.paramMap.get('importId');
    const importId = idRaw ? parseInt(idRaw, 10) : NaN;
    if (!importId || Number.isNaN(importId)) {
      this.loading.set(false);
      this.snackBar.open('Invalid import ID', 'Close', { duration: 5000 });
      return;
    }
    this.importId.set(importId);

    this.loadPreview(importId);
  }

  private loadPreview(importId: number): void {
    this.loading.set(true);
    this.csvService.previewCSV(importId, 5).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res.success || !res.data) {
          this.snackBar.open('Failed to load CSV preview', 'Close', { duration: 5000 });
          return;
        }
        this.preview.set(res.data);

        const detected = res.data.detectedType ?? 'unknown';
        this.dataType.set(detected === 'unknown' ? 'social_media' : detected);

        const selections: Record<string, string | null> = {};
        for (const f of res.data.systemFields ?? []) {
          selections[f.name] = null;
        }
        for (const f of this.requiredSystemFields()) {
          selections[f] = selections[f] ?? null;
        }

        // apply suggested mappings (csvHeader -> systemField)
        const suggested = res.data.suggestedMappings ?? {};
        for (const [csvHeader, field] of Object.entries(suggested)) {
          if (selections[field] === undefined) continue;
          if (selections[field] == null) selections[field] = csvHeader;
        }
        for (const field of this.requiredSystemFields()) {
          if (selections[field]) continue;
          const fallback = this.bestHeaderForField(field, res.data, selections);
          if (fallback) selections[field] = fallback;
        }
        this.fieldSelections.set(selections);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load CSV preview', 'Close', { duration: 5000 });
      },
    });
  }

  private buildMappingsPayload(): Record<string, string> | null {
    const selections = this.fieldSelections();
    const csvToField: Record<string, string> = {};
    const usedCsv = new Set<string>();
    const rows = this.preview()?.rows ?? [];
    const systemFields = this.systemFieldsSorted();
    const optionalNumericFields = new Set(
      systemFields.filter((f) => f.type === 'number' && !f.required).map((f) => f.name)
    );
    let removedNumericWarned = false;

    const parseLooseNumber = (v: unknown): number | null => {
      if (v == null) return null;
      const raw = String(v).trim();
      if (!raw) return null;
      // Handle Turkish / European formats like "1.234,56" and "3,14"
      let normalized = raw.replace(/\s+/g, '');
      if (normalized.includes(',') && normalized.includes('.')) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
      } else if (normalized.includes(',')) {
        normalized = normalized.replace(',', '.');
      }
      const n = Number(normalized);
      return Number.isFinite(n) ? n : null;
    };

    const looksNumericColumn = (fieldName: string, csvHeader: string): boolean => {
      if (!rows.length) return true; // no preview -> don't block
      const values = rows.map((r) => (r ? (r as any)[csvHeader] : undefined)).filter((v) => {
        const s = v == null ? '' : String(v).trim();
        return s !== '';
      });
      if (values.length === 0) return false;
      const ok = values.map((v) => parseLooseNumber(v)).filter((n) => n != null).length;
      const ratio = ok / values.length;
      // If majority of non-empty sample values are numeric, keep the mapping.
      return ratio >= 0.6;
    };

    for (const [field, csvHeader] of Object.entries(selections)) {
      if (!csvHeader) continue;
      // If user mapped an optional numeric system field (e.g., "rating") to a column
      // that doesn't look numeric in the preview sample, drop it to avoid validation errors.
      if (optionalNumericFields.has(field) && !looksNumericColumn(field, csvHeader)) {
        if (!removedNumericWarned) {
          removedNumericWarned = true;
          this.snackBar.open(
            `Auto-unmapped '${field}' because the selected CSV column doesn't look numeric. Please map correct numeric column or leave it "— not mapped".`,
            'Close',
            { duration: 8000 }
          );
        }
        continue;
      }
      if (usedCsv.has(csvHeader)) {
        this.snackBar.open(`CSV column '${csvHeader}' is mapped more than once`, 'Close', { duration: 6000 });
        return null;
      }
      usedCsv.add(csvHeader);
      csvToField[csvHeader] = field;
    }
    const missingRequired = this.requiredSystemFields().filter((field) => !Object.values(csvToField).includes(field));
    if (missingRequired.length > 0) {
      const friendly = missingRequired.map((field) => this.systemFieldLabel(field)).join(', ');
      this.importError.set({
        message: `Please map required field(s): ${friendly}`,
        guidance: [
          'Map the actual sentence/feedback text column to Content.',
          'For this file, the Turkish message column is usually named "İleti".',
          'Use Validate before Import to confirm the mapping.',
        ],
        errors: missingRequired.map((field) => ({
          rowNumber: 0,
          field,
          message: `${this.systemFieldLabel(field)} is required for ${this.dataType() === 'nps_survey' ? 'NPS' : 'feedback'} imports.`,
        })),
      });
      this.snackBar.open(`Please map required field(s): ${friendly}`, 'Close', { duration: 8000 });
      return null;
    }
    return csvToField;
  }

  private normalizeHeader(value: string): string {
    return String(value || '')
      .trim()
      .toLocaleLowerCase('tr-TR')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private bestHeaderForField(
    field: string,
    preview: CSVPreview,
    selections: Record<string, string | null>
  ): string | null {
    const taken = new Set(Object.values(selections).filter(Boolean) as string[]);
    const headers = preview.headers.filter((header) => !taken.has(header));
    const rows = preview.rows ?? [];
    const synonyms: Record<string, string[]> = {
      content: [
        'ileti',
        'mesaj',
        'yorum',
        'metin',
        'icerik',
        'content',
        'text',
        'message',
        'comment',
        'feedback',
        'tweet',
        'tweet_text',
        'source_tweet',
        'original_text',
        'sentence',
      ],
      date: ['ileti_tarihi', 'yaratilma_tarihi', 'tarih', 'date', 'created_at', 'created', 'timestamp'],
      source: ['site_turu', 'mecra', 'source', 'platform', 'channel'],
      score: ['nps', 'nps_score', 'score', 'puan', 'degeri', 'mecra_degeri'],
    };
    const exact = new Set(synonyms[field] ?? []);
    for (const header of headers) {
      const normalized = this.normalizeHeader(header);
      if (exact.has(normalized)) return header;
    }
    if (field !== 'content') return null;

    let best: { header: string; score: number } | null = null;
    for (const header of headers) {
      const normalized = this.normalizeHeader(header);
      if (/(id|rowid|date|tarih|source|site|mecra|rating|score|puan|about|konu)$/i.test(normalized)) continue;
      const values = rows.map((row) => String(row?.[header] ?? '').trim()).filter(Boolean);
      if (!values.length) continue;
      const avgLength = values.reduce((sum, value) => sum + value.length, 0) / values.length;
      const letterRatio =
        values.reduce((sum, value) => sum + (/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(value) ? 1 : 0), 0) / values.length;
      const urlPenalty = values.some((value) => /^https?:\/\//i.test(value) || /^[a-f0-9]{16,}$/i.test(value)) ? 40 : 0;
      const score = Math.min(avgLength, 240) * letterRatio - urlPenalty;
      if (!best || score > best.score) best = { header, score };
    }
    return best && best.score >= 20 ? best.header : null;
  }

  systemFieldLabel(name: string): string {
    const labels: Record<string, string> = {
      content: 'Content / sentence',
      date: 'Date',
      source: 'Source',
      score: 'NPS score',
      author: 'Author',
      rating: 'Rating',
      sentiment: 'Sentiment',
      company: 'Company',
      companyName: 'Company name',
      competitor: 'Competitor',
      competitorId: 'Competitor ID',
      cxRelated: 'CX related',
      originalCustomerCx: 'Original customer CX',
    };
    return labels[name] ?? name;
  }

  systemFieldHint(name: string): string {
    const hints: Record<string, string> = {
      content: 'Map the original customer sentence/message here. For Turkish exports, this is usually "İleti".',
      date: 'Map the message date. Auto date parsing supports Turkish and Excel formats.',
      source: 'Map channel/platform/source, for example Twitter, Sikayetvar, App Store, or Site Türü.',
      score: 'Map NPS score only for NPS survey imports.',
      rating: 'Optional numeric/star rating. Leave unmapped if this column is not numeric.',
    };
    return hints[name] ?? '';
  }

  onSelectField(systemFieldName: string, csvHeader: string | null): void {
    this.fieldSelections.set({ ...this.fieldSelections(), [systemFieldName]: csvHeader });
  }

  isCsvHeaderTakenByOtherField(csvHeader: string, systemFieldName: string): boolean {
    const selections = this.fieldSelections();
    return Object.entries(selections).some(([field, selectedHeader]) => field !== systemFieldName && selectedHeader === csvHeader);
  }

  validate(): void {
    const importId = this.importId();
    if (!importId) return;
    const mappings = this.buildMappingsPayload();
    if (!mappings) return;
    this.validating.set(true);
    this.validation.set(null);
    this.importError.set(null);
    this.csvService
      .validateImport(importId, {
        mappings,
        dataType: this.dataType(),
        sampleLimit: Math.min(200, this.preview()?.rowCount ?? 50),
        dateFormat: this.dateFormat(),
      })
      .subscribe({
        next: (res) => {
          this.validating.set(false);
          this.importError.set(null);
          if (!res.success || !res.data) {
            this.snackBar.open('Validation failed', 'Close', { duration: 5000 });
            return;
          }
          this.validation.set(res.data);
          if (res.data.valid) {
            this.snackBar.open('Validation passed. Ready to import.', 'Close', { duration: 4000 });
          } else {
            this.snackBar.open(`Validation found ${res.data.errors.length} issue(s).`, 'Close', { duration: 6000 });
          }
        },
        error: (err) => {
          this.validating.set(false);
          this.importError.set(null);
          const api = err && typeof err === 'object' && 'error' in err ? (err as any).error : null;
          const msg = (api && typeof api.message === 'string' && api.message) ? api.message : 'Validation failed';
          const count = Array.isArray(api?.data?.errors) ? api.data.errors.length : null;
          this.snackBar.open(count != null ? `${msg} (${count} issue(s))` : msg, 'Close', { duration: 9000 });
        },
      });
  }

  private aiSummaryText(aiSummary: {
    enabled: boolean;
    attempted: number;
    succeeded: number;
    failed: number;
  } | undefined): string {
    if (!aiSummary?.enabled) return '';
    return ` AI: ${aiSummary.succeeded}/${aiSummary.attempted} success, ${aiSummary.failed} failed.`;
  }

  startImport(): void {
    const importId = this.importId();
    if (!importId) return;
    const mappings = this.buildMappingsPayload();
    if (!mappings) return;

    // Validation is advisory only; import can proceed with partial mappings.

    const dt = this.dataType();
    this.importError.set(null);
    this.validating.set(true);
    this.csvService.processImport(importId, mappings, this.companyId(), dt, this.dateFormat()).subscribe({
      next: (res) => {
        this.validating.set(false);
        this.importError.set(null);
        if (!res.success || !res.data) {
          const msg = res.message || 'Import failed';
          this.snackBar.open(msg, 'Close', { duration: 8000 });
          return;
        }

        this.importStarted.set(true);
        this.snackBar.open('Import started. Redirecting to Import History for live progress...', 'Close', {
          duration: 5000,
        });
        this.router.navigate(['/app/data-sources/import-history'], {
          queryParams: { importId },
        });
      },
      error: (err) => {
        this.validating.set(false);
        const api = err && typeof err === 'object' && 'error' in err ? (err as any).error : null;
        const msg = (api && typeof api.message === 'string' && api.message) ? api.message : 'Import failed';
        const errors: RowValidationError[] = Array.isArray(api?.data?.errors) ? api.data.errors : [];
        const errorDetails = api?.data?.errorDetails;

        const guidance: string[] | undefined = errorDetails?.guidance;
        const totalIssues: number | undefined = errorDetails?.totalIssues;

        // Toast + on-screen panel (client request).
        this.snackBar.open(
          errors.length > 0
            ? `${msg} (${errors.length} issue(s))`
            : msg,
          'Close',
          { duration: 10000 }
        );

        // Show a detailed error panel on screen (client feedback request).
        if (errors.length > 0) {
          this.importError.set({
            message: msg,
            totalIssues,
            guidance,
            errors,
          });
        } else {
          this.importError.set({
            message: msg,
            guidance,
            errors: [],
          });
        }
      },
    });
  }

}
