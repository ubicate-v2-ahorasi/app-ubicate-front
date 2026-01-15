import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VoiceAssistantService {
  private synthesis: SpeechSynthesis;
  private recognition: any;
  private isEnabledSubject = new BehaviorSubject<boolean>(false);
  public isEnabled$ = this.isEnabledSubject.asObservable();
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    
    // Verificar soporte de reconocimiento de voz
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }

    // Cargar preferencia guardada
    const saved = localStorage.getItem('voice_assistant_enabled');
    if (saved === 'true') {
      this.isEnabledSubject.next(true);
    }
  }

  toggle(): void {
    const newState = !this.isEnabledSubject.value;
    this.isEnabledSubject.next(newState);
    localStorage.setItem('voice_assistant_enabled', String(newState));
    
    if (newState) {
      this.speak('Asistente de voz activado');
    } else {
      this.stop();
    }
  }

  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): void {
    if (!this.isEnabledSubject.value) return;

    // Cancelar cualquier lectura anterior
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = options?.volume || 1.0;

    // Buscar voz en español
    const voices = this.synthesis.getVoices();
    const spanishVoice = voices.find(voice => voice.lang.includes('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    this.currentUtterance = utterance;
    this.synthesis.speak(utterance);
  }

  stop(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  pause(): void {
    if (this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  resume(): void {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  // Reconocimiento de voz
  startListening(callback: (text: string) => void): void {
    if (!this.recognition) {
      console.warn('Reconocimiento de voz no soportado en este navegador');
      return;
    }

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      callback(transcript);
    };

    this.recognition.onerror = (event: any) => {
      console.error('Error en reconocimiento de voz:', event.error);
    };

    this.recognition.start();
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // Leer elementos de la interfaz
  announceElement(elementType: string, elementName: string): void {
    this.speak(`${elementType}: ${elementName}`);
  }

  announceNavigation(pageName: string): void {
    this.speak(`Navegando a ${pageName}`);
  }

  announceError(error: string): void {
    this.speak(`Error: ${error}`);
  }

  announceSuccess(message: string): void {
    this.speak(`Éxito: ${message}`);
  }
}
