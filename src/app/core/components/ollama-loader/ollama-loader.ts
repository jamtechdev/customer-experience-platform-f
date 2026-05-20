import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ollama-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ollama-loader.html',
  styleUrl: './ollama-loader.css',
})
export class OllamaLoader {
  title = input<string>('AI is preparing your workspace');
  subtitle = input<string>('Loading saved insights and preparing the page');
  loaderRings = Array.from({ length: 15 }, (_, idx) => idx + 1);
}
