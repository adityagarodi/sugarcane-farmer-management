import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  question = '';
  answer = '';
  loading = false;
  error = '';

  constructor(private http: HttpClient) {}

  useQuestion(text: string) {
    this.question = text;
    this.error = '';
  }

  onEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;

    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.askQuestion();
    }
  }

  askQuestion() {
    if (!this.question.trim() || this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.answer = '';

    this.http.post<{ answer: string }>(
      'http://localhost:3000/api/ask',
      { question: this.question }
    ).subscribe({
      next: (response) => {
        this.answer = response.answer;
        this.loading = false;
      },
      error: (err) => {
        this.error =
          err.error?.error ||
          'Unable to connect to the backend. Please try again.';

        this.loading = false;
      }
    });
  }
}