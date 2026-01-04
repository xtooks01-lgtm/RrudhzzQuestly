
class SoundService {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private osc(freq: number, dur: number, type: OscillatorType, time: number, volume: number = 0.1) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx.currentTime + time);
    
    g.gain.setValueAtTime(volume, this.ctx.currentTime + time);
    g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + time + dur);
    
    o.connect(g);
    g.connect(this.ctx.destination);
    
    o.start(this.ctx.currentTime + time);
    o.stop(this.ctx.currentTime + time + dur);
  }

  playAdd() {
    this.init();
    this.osc(440, 0.1, 'sine', 0);
    this.osc(880, 0.1, 'sine', 0.05);
  }

  playComplete() {
    this.init();
    // C Major Triad
    this.osc(523.25, 0.15, 'sine', 0);    // C5
    this.osc(659.25, 0.15, 'sine', 0.08); // E5
    this.osc(783.99, 0.25, 'sine', 0.16); // G5
  }

  playDelete() {
    this.init();
    this.osc(180, 0.2, 'sawtooth', 0, 0.05);
  }

  playBadge() {
    this.init();
    // Arpeggio leading up to a bright tone
    this.osc(392.00, 0.1, 'sine', 0);    // G4
    this.osc(523.25, 0.1, 'sine', 0.05); // C5
    this.osc(659.25, 0.1, 'sine', 0.1);  // E5
    this.osc(1046.50, 0.4, 'sine', 0.15, 0.15); // C6
  }
}

export const soundService = new SoundService();
