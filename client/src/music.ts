// "Neon Pursuit" – an original synthwave soundtrack generated live with the
// Web Audio API (no audio files, nothing to download, no licensing issues).
// 124 BPM in A minor, i–VI–III–VII (Am–F–C–G). The arrangement cycles through
// intro → drive → breakdown → drop, so it keeps moving during long matches.

const BPM = 124;
const STEP = 60 / BPM / 4; // one 16th note
const BAR = 16;
const SECTION_BARS = 8;
const LOOKAHEAD = 0.12; // seconds of audio scheduled ahead of time

type Section = 'intro' | 'drive' | 'break' | 'drop';
const ARRANGEMENT: Section[] = ['drive', 'break', 'drop', 'drive'];

// Chords as MIDI notes (root position, around C4), with bass roots.
const CHORDS = [
  {notes: [57, 60, 64], bass: 33}, // Am
  {notes: [53, 57, 60], bass: 29}, // F
  {notes: [55, 60, 64], bass: 36}, // C
  {notes: [55, 59, 62], bass: 31}, // G
];
// Lead hook over two bars, repeated with a variation: [step, midi, length in steps].
const HOOK: [number, number, number][] = [
  [0, 76, 3], [3, 74, 3], [6, 72, 2], [8, 69, 4], [12, 72, 2], [14, 74, 2],
  [16, 76, 3], [19, 79, 3], [22, 76, 2], [24, 74, 6], [30, 72, 2],
];
const HOOK_B: [number, number, number][] = [
  [0, 81, 3], [3, 79, 3], [6, 76, 2], [8, 74, 4], [12, 76, 2], [14, 79, 2],
  [16, 81, 4], [20, 79, 2], [22, 76, 2], [24, 74, 4], [28, 72, 4],
];
const ARP = [0, 1, 2, 4, 2, 1, 3, 5, 0, 2, 1, 4, 2, 5, 3, 1];

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

class Music {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private muffle!: BiquadFilterNode;
  private bus!: GainNode;
  private delay!: DelayNode;
  private reverb!: ConvolverNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private volume = 0.7;
  private playing = false;

  /** Create or resume the audio context. Call from a user gesture where possible. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.build();
    }
    if (this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume().catch(() => {});
  }

  private build() {
    const c = this.ctx!;
    this.master = c.createGain();
    this.master.gain.value = 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    this.muffle = c.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 20000;
    this.bus = c.createGain();
    this.bus.connect(comp).connect(this.muffle).connect(this.master).connect(c.destination);

    // Dotted-eighth echo for arps and lead.
    this.delay = c.createDelay(1);
    this.delay.delayTime.value = STEP * 3;
    const fb = c.createGain();
    fb.gain.value = 0.34;
    const tone = c.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    this.delay.connect(tone).connect(fb).connect(this.delay);
    tone.connect(this.bus);

    // Small synthetic hall reverb.
    this.reverb = c.createConvolver();
    const len = c.sampleRate * 2.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    this.reverb.buffer = ir;
    const wet = c.createGain();
    wet.gain.value = 0.22;
    this.reverb.connect(wet).connect(this.bus);

    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const n = this.noise.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else if (this.playing) void this.ctx.resume();
    });
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.ctx && this.playing) this.master.gain.setTargetAtTime(this.volume * 0.55, this.ctx.currentTime, 0.1);
  }

  /** Muffle the music (e.g. while a menu is open over the match). */
  setMuffled(on: boolean) {
    if (!this.ctx) return;
    this.muffle.frequency.setTargetAtTime(on ? 650 : 20000, this.ctx.currentTime, 0.15);
  }

  start() {
    this.unlock();
    if (!this.ctx || this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setValueAtTime(0, this.ctx.currentTime);
    this.master.gain.linearRampToValueAtTime(this.volume * 0.55, this.ctx.currentTime + 1.5);
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (!this.ctx || !this.playing) return;
    this.playing = false;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.6);
    const timer = this.timer;
    this.timer = null;
    window.setTimeout(() => { if (timer !== null) clearInterval(timer); }, 650);
  }

  // ------------------------------------------------------------ sequencer
  private section(): Section {
    const sec = Math.floor(this.step / (BAR * SECTION_BARS));
    return sec === 0 ? 'intro' : ARRANGEMENT[(sec - 1) % ARRANGEMENT.length];
  }

  private schedule() {
    if (!this.ctx || this.timer === null) return;
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      if (this.playing) this.play(this.step, this.nextTime);
      this.step++;
      this.nextTime += STEP;
    }
  }

  private play(step: number, t: number) {
    const s = step % BAR, bar = Math.floor(step / BAR), barInSection = bar % SECTION_BARS;
    const chord = CHORDS[bar % 4], sec = this.section();
    const drums = sec === 'drive' || sec === 'drop';
    const lastBar = barInSection === SECTION_BARS - 1;

    if (drums) {
      if (s % 4 === 0) this.kick(t);
      if (s === 4 || s === 12) this.snare(t);
      if (sec === 'drop' && lastBar && s >= 8) this.snare(t, 0.35 + (s - 8) * 0.05);
      this.hat(t, s % 4 === 2 ? 0.16 : 0.07, s % 4 === 2 && sec === 'drop');
    } else if (sec === 'intro' && s % 2 === 0) {
      this.hat(t, 0.05, false);
    }
    if (sec !== 'intro' || barInSection >= 4) {
      if (sec !== 'break' && s % 2 === 0) this.bass(t, chord.bass + (s % 8 === 6 ? 12 : 0), drums);
      if (sec === 'break' && s === 0) this.bass(t, chord.bass, false, STEP * 16);
    }
    if (s === 0) this.pad(t, chord.notes, sec === 'break' ? 0.07 : 0.05);
    const tones = [...chord.notes, ...chord.notes.map(n => n + 12)];
    const open = sec === 'intro' ? 600 + barInSection * 350 : sec === 'break' ? 1400 : 3200;
    this.arp(t, hz(tones[ARP[s]] + 12), open);

    if (sec === 'drop' || (sec === 'break' && barInSection >= 4)) {
      const hook = (Math.floor(bar / 2) % 2 === 0 ? HOOK : HOOK_B);
      const pos = (bar % 2) * BAR + s;
      for (const [at, note, len] of hook) if (at === pos) this.lead(t, hz(note), len * STEP, sec === 'break' ? 0.05 : 0.08);
    }
    if (lastBar && sec !== 'drop' && s === 0) this.riser(t, STEP * 16);
  }

  // ------------------------------------------------------------ instruments
  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private kick(t: number) {
    const c = this.ctx!, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.9, 0.002, 0.32);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.4);
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, peak: number, decay: number, send = false) {
    const c = this.ctx!, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise;
    f.type = type;
    f.frequency.value = freq;
    this.env(g, t, peak, 0.001, decay);
    src.connect(f).connect(g).connect(this.bus);
    if (send) g.connect(this.reverb);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.05);
  }

  private snare(t: number, peak = 0.45) {
    this.noiseHit(t, 'bandpass', 1900, peak, 0.18, true);
    const c = this.ctx!, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    this.env(g, t, peak * 0.5, 0.001, 0.1);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.15);
  }

  private hat(t: number, peak: number, open: boolean) {
    this.noiseHit(t, 'highpass', 8000, peak, open ? 0.22 : 0.04);
  }

  private bass(t: number, midi: number, duck: boolean, len = STEP * 1.6) {
    const c = this.ctx!, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass';
    f.Q.value = 6;
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(180, t + len);
    for (const detune of [-8, 8]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(midi);
      o.detune.value = detune;
      o.connect(f);
      o.start(t);
      o.stop(t + len + 0.05);
    }
    // Sit slightly lower under the drums so the kick punches through.
    this.env(g, t, duck ? 0.2 : 0.28, 0.005, len);
    f.connect(g).connect(this.bus);
  }

  private pad(t: number, notes: number[], peak: number) {
    const c = this.ctx!, f = c.createBiquadFilter(), g = c.createGain(), len = STEP * BAR;
    f.type = 'lowpass';
    f.frequency.value = 1500;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.6);
    g.gain.setValueAtTime(peak, t + len - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.2);
    for (const n of notes)
      for (const detune of [-12, 12]) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = hz(n - 12);
        o.detune.value = detune;
        o.connect(f);
        o.start(t);
        o.stop(t + len + 0.3);
      }
    f.connect(g).connect(this.bus);
    g.connect(this.reverb);
  }

  private arp(t: number, freq: number, cutoff: number) {
    const c = this.ctx!, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    f.Q.value = 4;
    this.env(g, t, 0.05, 0.003, STEP * 0.9);
    o.connect(f).connect(g).connect(this.bus);
    g.connect(this.delay);
    o.start(t);
    o.stop(t + STEP + 0.05);
  }

  private lead(t: number, freq: number, len: number, peak: number) {
    const c = this.ctx!, f = c.createBiquadFilter(), g = c.createGain(), vib = c.createOscillator(), vibAmt = c.createGain();
    f.type = 'lowpass';
    f.frequency.value = 3800;
    vib.frequency.value = 5.5;
    vibAmt.gain.value = 6;
    vib.connect(vibAmt);
    for (const [type, detune] of [['sawtooth', -7], ['square', 7]] as const) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      vibAmt.connect(o.detune);
      o.connect(f);
      o.start(t);
      o.stop(t + len + 0.2);
    }
    vib.start(t);
    vib.stop(t + len + 0.2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.setValueAtTime(peak, t + len * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.15);
    f.connect(g).connect(this.bus);
    g.connect(this.delay);
    g.connect(this.reverb);
  }

  private riser(t: number, len: number) {
    const c = this.ctx!, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise;
    src.loop = true;
    f.type = 'bandpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(6000, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + len);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
    src.connect(f).connect(g).connect(this.bus);
    g.connect(this.reverb);
    src.start(t);
    src.stop(t + len + 0.1);
  }
}

export const music = new Music();
