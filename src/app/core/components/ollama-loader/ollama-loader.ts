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
  title = input<string>('Ollama AI is analyzing data');
  subtitle = input<string>('Processing insights and preparing human-friendly output');
  loaderRings = Array.from({ length: 15 }, (_, idx) => idx + 1);
}
