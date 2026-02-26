import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-report-builder',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './report-builder.html',
  styleUrl: './report-builder.css',
})
export class ReportBuilder {
}
