import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-page-header-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './page-header-card.html',
  styleUrl: './page-header-card.css',
})
export class PageHeaderCard {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() badge = '';
  @Input() icon = 'insights';
}
