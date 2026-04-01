import { Component, computed, inject, signal } from '@angular/core';
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

interface ExtractedRecord {
  id: string;
  source: string;
  company: string;
  competitor: string;
  content: string;
  date: string;
  rating: string;
}

const STORAGE_KEY = 'source_extraction_records_v1';

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
  ],
  templateUrl: './source-extraction.html',
  styleUrl: './source-extraction.css',
})
export class SourceExtraction {
  private snackBar = inject(MatSnackBar);

  readonly sources = ['Instagram', 'Twitter/X', 'YouTube', 'Google Reviews', 'App Store', 'Play Store', 'Sikayetvar'];
  readonly displayedColumns = ['source', 'company', 'competitor', 'content', 'date', 'actions'];

  source = 'Instagram';
  company = '';
  competitor = '';
  content = '';
  date = '';
  rating = '';
  sourceFilter = '';

  records = signal<ExtractedRecord[]>(this.loadRecords());
  filteredRecords = computed(() => {
    const filter = this.sourceFilter.trim().toLowerCase();
    if (!filter) return this.records();
    return this.records().filter((r) => r.source.toLowerCase() === filter);
  });

  addRecord(): void {
    if (!this.content.trim() || !this.company.trim() || !this.date) {
      this.snackBar.open('Company, date and content are required.', 'Close', { duration: 2500 });
      return;
    }
    const next: ExtractedRecord = {
      id: crypto.randomUUID(),
      source: this.source,
      company: this.company.trim(),
      competitor: this.competitor.trim(),
      content: this.content.trim(),
      date: this.date,
      rating: this.rating.trim(),
    };
    const updated = [next, ...this.records()];
    this.records.set(updated);
    this.persist(updated);
    this.resetForm();
  }

  removeRecord(id: string): void {
    const updated = this.records().filter((r) => r.id !== id);
    this.records.set(updated);
    this.persist(updated);
  }

  clearAll(): void {
    this.records.set([]);
    this.persist([]);
  }

  onCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = this.parseCsv(text);
      if (parsed.length === 0) {
        this.snackBar.open('No valid rows found in CSV.', 'Close', { duration: 2500 });
        return;
      }
      const updated = [...parsed, ...this.records()];
      this.records.set(updated);
      this.persist(updated);
      this.snackBar.open(`${parsed.length} rows imported.`, 'Close', { duration: 2500 });
      input.value = '';
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
        id: crypto.randomUUID(),
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

  private loadRecords(): ExtractedRecord[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ExtractedRecord[]) : [];
    } catch {
      return [];
    }
  }

  private persist(records: ExtractedRecord[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  private resetForm(): void {
    this.company = '';
    this.competitor = '';
    this.content = '';
    this.date = '';
    this.rating = '';
  }
}

