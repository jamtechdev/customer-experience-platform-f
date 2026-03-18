import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
  SystemField,
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
  importing = signal(false);

  dataType = signal<'social_media' | 'app_review' | 'nps_survey' | 'complaint' | 'unknown'>('unknown');
  validation = signal<ValidateMappingsResult | null>(null);

  // systemField -> csvHeader (or null)
  fieldSelections = signal<Record<string, string | null>>({});

  companyId = computed(() => this.authService.currentUser()?.settings?.companyId ?? 1);

  systemFieldsSorted = computed<SystemField[]>(() => {
    const fields = this.preview()?.systemFields ?? [];
    const req = fields.filter((f) => f.required).sort((a, b) => a.name.localeCompare(b.name));
    const opt = fields.filter((f) => !f.required).sort((a, b) => a.name.localeCompare(b.name));
    return [...req, ...opt];
  });

  headers = computed(() => this.preview()?.headers ?? []);

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
        // apply suggested mappings (csvHeader -> systemField)
        const suggested = res.data.suggestedMappings ?? {};
        for (const [csvHeader, field] of Object.entries(suggested)) {
          if (selections[field] === undefined) continue;
          if (selections[field] == null) selections[field] = csvHeader;
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

    for (const [field, csvHeader] of Object.entries(selections)) {
      if (!csvHeader) continue;
      if (usedCsv.has(csvHeader)) {
        this.snackBar.open(`CSV column '${csvHeader}' is mapped more than once`, 'Close', { duration: 6000 });
        return null;
      }
      usedCsv.add(csvHeader);
      csvToField[csvHeader] = field;
    }
    return csvToField;
  }

  onSelectField(systemFieldName: string, csvHeader: string | null): void {
    this.fieldSelections.set({ ...this.fieldSelections(), [systemFieldName]: csvHeader });
  }

  validate(): void {
    const importId = this.importId();
    if (!importId) return;
    const mappings = this.buildMappingsPayload();
    if (!mappings) return;
    this.validating.set(true);
    this.validation.set(null);
    this.csvService
      .validateImport(importId, { mappings, dataType: this.dataType(), sampleLimit: 50 })
      .subscribe({
        next: (res) => {
          this.validating.set(false);
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
          const api = err && typeof err === 'object' && 'error' in err ? (err as any).error : null;
          const msg = (api && typeof api.message === 'string' && api.message) ? api.message : 'Validation failed';
          const count = Array.isArray(api?.data?.errors) ? api.data.errors.length : null;
          this.snackBar.open(count != null ? `${msg} (${count} issue(s))` : msg, 'Close', { duration: 9000 });
        },
      });
  }

  startImport(): void {
    const importId = this.importId();
    if (!importId) return;
    const mappings = this.buildMappingsPayload();
    if (!mappings) return;

    // If we have a validation result and it failed, don’t start.
    if (this.validation() && !this.validation()!.valid) {
      this.snackBar.open('Fix validation issues before importing.', 'Close', { duration: 6000 });
      return;
    }

    this.importing.set(true);
    const dt = this.dataType();
    const dtArg = dt === 'unknown' ? undefined : dt;
    this.csvService.processImport(importId, mappings, this.companyId(), dtArg).subscribe({
      next: (res) => {
        this.importing.set(false);
        if (res.success && res.data?.success) {
          this.snackBar.open(`Import started: ${res.data.importedCount} row(s) imported.`, 'Close', { duration: 6000 });
          this.router.navigate(['/app/data-sources/import-history']);
          return;
        }
        const msg = res.message || 'Import failed';
        this.snackBar.open(msg, 'Close', { duration: 8000 });
      },
      error: (err) => {
        this.importing.set(false);
        const api = err && typeof err === 'object' && 'error' in err ? (err as any).error : null;
        const msg = (api && typeof api.message === 'string' && api.message) ? api.message : 'Import failed';
        const count = Array.isArray(api?.data?.errors) ? api.data.errors.length : null;
        this.snackBar.open(count != null ? `${msg} (${count} issue(s))` : msg, 'Close', { duration: 10000 });
      },
    });
  }

}
