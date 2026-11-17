// WebAudio synthesis only — no audio files. Bell tones are a fundamental
// plus inharmonic harmonics with an exponential decay; chords get a warm
// major chime, Voice loss a low toll, muted bells a dead thud, Pip's nip
// a tiny bright yip. Everything is guarded: no AudioContext exists until
// the first user gesture (or never, in soak/shot mode), and every call
// is a no-op when audio is off.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.master = null;
  }

  // Call from a user gesture. Safe to call repeatedly; safe to never call.
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      this.enabled = true;
    } catch {
      this.enabled = false;
    }
  }

  tone(freq, dur, vol, partials) {
    if (!this.enabled || !this.ctx) return;
    try {
      const t0 = this.ctx.currentTime;
      const out = this.ctx.createGain();
      out.gain.setValueAtTime(0, t0);
      out.gain.linearRampToValueAtTime(vol, t0 + 0.008);
      out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      out.connect(this.master);
      for (const [mult, amp] of partials) {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq * mult;
        const g = this.ctx.createGain();
        g.gain.value = amp;
        osc.connect(g);
        g.connect(out);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
      }
    } catch {
      // Audio must never break the game.
    }
  }

  // One bell's ring: fundamental + the bell's bright inharmonic partials.
  ring(pitch) {
    this.tone(pitch, 1.6, 0.5, [[1, 1], [2.02, 0.45], [2.74, 0.28], [3.76, 0.12]]);
  }

  // CHORD: a warm major chime over the two bells.
  chord() {
    this.tone(1046, 1.2, 0.35, [[1, 1], [2.02, 0.4]]);
    this.tone(1318, 1.2, 0.3, [[1, 1], [2.02, 0.4]]);
    this.tone(1568, 1.4, 0.25, [[1, 1], [2.02, 0.35]]);
  }

  // A wraith reaches the belfry: the Great Bell tolls low.
  toll() {
    this.tone(98, 2.2, 0.6, [[1, 1], [2.02, 0.35], [2.94, 0.18]]);
  }

  // A muted bell tries to ring and cannot.
  thud() {
    this.tone(70, 0.25, 0.3, [[1, 1], [1.5, 0.4]]);
  }

  // Pip nips: a tiny bright yip.
  yip() {
    this.tone(1320, 0.18, 0.25, [[1, 1], [1.5, 0.3]]);
  }

  // Victory peal / defeat hush.
  peal() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.ring(f), i * 220);
    });
  }
}
