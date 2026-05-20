import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OllamaLoader } from '../../../core/components/ollama-loader/ollama-loader';
import { SourceExtractionService } from '../../../core/services/source-extraction.service';

interface ExtractedRecord {
  id: string;
  source: string;
  company: string;
  competitor: string;
  content: string;
  date: string;
  rating: string;
}

@Component({
  selector: 'app-source-extraction',
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSnackBarModule,
    OllamaLoader,
  ],
  templateUrl: './source-extraction.html',
  styleUrl: './source-extraction.css',
})
export class SourceExtraction implements OnInit {
  private snackBar = inject(MatSnackBar);
  private sourceExtractionService = inject(SourceExtractionService);

  readonly sources = ['Instagram', 'Twitter/X', 'YouTube', 'Google Reviews', 'App Store', 'Play Store', 'Sikayetvar'];
  readonly displayedColumns = ['source', 'company', 'competitor', 'content', 'date', 'actions'];

  source = 'Instagram';
  company = '';
  competitor = '';
  content = '';
  date = '';
  rating = '';
  sourceFilter = '';

  records = signal<ExtractedRecord[]>([]);
  processing = signal(false);
  filteredRecords = computed(() => {
    const filter = this.sourceFilter.trim().toLowerCase();
    if (!filter) return this.records();
    return this.records().filter((r) => r.source.toLowerCase() === filter);
  });

  ngOnInit(): void {
    this.loadRecords();
  }

  addRecord(): void {
    if (!this.content.trim() || !this.company.trim() || !this.date) {
      this.snackBar.open('Company, date and content are required.', 'Close', { duration: 2500 });
      return;
    }
    const next = {
      source: this.source,
      company: this.company.trim(),
      competitor: this.competitor.trim(),
      content: this.content.trim(),
      date: this.date,
      rating: this.rating.trim(),
    };
    this.processing.set(true);
    this.sourceExtractionService.createRecord(next).subscribe({
      next: (res) => {
        this.processing.set(false);
        if (res.success && res.data) {
          this.records.update((rows) => [this.normalizeRecord(res.data), ...rows]);
          this.resetForm();
        }
      },
      error: () => {
        this.processing.set(false);
        this.snackBar.open('Could not save record.', 'Close', { duration: 2500 });
      },
    });
  }

  removeRecord(id: string): void {
    this.sourceExtractionService.deleteRecord(id).subscribe({
      next: () => this.records.update((rows) => rows.filter((r) => r.id !== id)),
      error: () => this.snackBar.open('Could not delete record.', 'Close', { duration: 2500 }),
    });
  }

  clearAll(): void {
    this.sourceExtractionService.clearRecords().subscribe({
      next: () => this.records.set([]),
      error: () => this.snackBar.open('Could not clear records.', 'Close', { duration: 2500 }),
    });
  }

  onCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    this.processing.set(true);
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = this.parseCsv(text);
      if (parsed.length === 0) {
        this.processing.set(false);
        this.snackBar.open('No valid rows found in CSV.', 'Close', { duration: 2500 });
        return;
      }
      this.sourceExtractionService.createRecords(parsed.map(({ id, ...row }) => row)).subscribe({
        next: (res) => {
          this.processing.set(false);
          const saved = Array.isArray(res.data) ? res.data.map((row) => this.normalizeRecord(row)) : [];
          this.records.update((rows) => [...saved, ...rows]);
          this.snackBar.open(`${saved.length} rows imported.`, 'Close', { duration: 2500 });
          input.value = '';
        },
        error: () => {
          this.processing.set(false);
          this.snackBar.open('CSV import failed. Please try again.', 'Close', { duration: 2500 });
        },
      });
    };
    reader.onerror = () => {
      this.processing.set(false);
      this.snackBar.open('CSV import failed. Please try again.', 'Close', { duration: 2500 });
    };
    reader.readAsText(file);
  }

  private parseCsv(text: string): ExtractedRecord[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idx = {
      source: headers.indexOf('source'),
      company: headers.indexOf('company'),
      competitor: headers.indexOf('competitor'),
      content: headers.indexOf('content'),
      date: headers.indexOf('date'),
      rating: headers.indexOf('rating'),
    };
    if (idx.content === -1 || idx.date === -1 || idx.source === -1) return [];
    const rows: ExtractedRecord[] = [];
    for (const line of lines.slice(1)) {
      const cols = line.split(',').map((c) => c.trim());
      const content = cols[idx.content] || '';
      const date = cols[idx.date] || '';
      const source = cols[idx.source] || '';
      if (!content || !date || !source) continue;
      rows.push({
        id: '',
        source,
        company: idx.company >= 0 ? cols[idx.company] || '' : '',
        competitor: idx.competitor >= 0 ? cols[idx.competitor] || '' : '',
        content,
        date,
        rating: idx.rating >= 0 ? cols[idx.rating] || '' : '',
      });
    }
    return rows;
  }

  private loadRecords(): void {
    this.processing.set(true);
    this.sourceExtractionService.getRecords().subscribe({
      next: (res) => {
        this.processing.set(false);
        this.records.set(Array.isArray(res.data) ? res.data.map((row) => this.normalizeRecord(row)) : []);
      },
      error: () => {
        this.processing.set(false);
        this.records.set([]);
      },
    });
  }

  private normalizeRecord(record: any): ExtractedRecord {
    return {
      id: String(record.id || ''),
      source: String(record.source || ''),
      company: String(record.company || ''),
      competitor: String(record.competitor || ''),
      content: String(record.content || ''),
      date: String(record.date || '').slice(0, 10),
      rating: String(record.rating || ''),
    };
  }

  private resetForm(): void {
    this.company = '';
    this.competitor = '';
    this.content = '';
    this.date = '';
    this.rating = '';
  }
}

