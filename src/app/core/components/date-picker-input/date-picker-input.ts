import { Component, inject, input, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslationService } from '../../services/translation.service';
import { openNativeDatePicker } from '../../utils/date-picker';

@Component({
  selector: 'app-date-picker-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './date-picker-input.html',
  styleUrl: './date-picker-input.css',
})
export class DatePickerInput {
  private translationService = inject(TranslationService);

  label = input('');
  labelKey = input<string | null>(null);
  disabled = input(false);
  ariaLabelKey = input<string | null>(null);

  value = model<string | null>(null);

  readonly t = (key: string): string => this.translationService.translate(key);

  fieldLabel(): string {
    const key = this.labelKey();
    if (key) return this.t(key);
    return this.label();
  }

  ariaLabel(): string {
    const key = this.ariaLabelKey() ?? this.labelKey();
    return key ? this.t(key) : this.fieldLabel();
  }

  onValueChange(next: string): void {
    this.value.set(next?.trim() ? next : null);
  }

  onFieldClick(event: MouseEvent, input: HTMLInputElement): void {
    if (this.disabled()) return;
    const target = event.target as HTMLElement;
    if (target.closest('button.date-picker-trigger')) return;
    this.openPicker(input);
  }

  onTriggerClick(event: MouseEvent, input: HTMLInputElement): void {
    event.preventDefault();
    event.stopPropagation();
    this.openPicker(input);
  }

  onInputKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPicker(input);
    }
  }

  openPicker(input: HTMLInputElement): void {
    openNativeDatePicker(input);
  }
}
