// Synthesised WebAudio only — no audio files, no network. A tiny helper that
// plays a short oscillator blip (or a two-note phrase) on a user gesture or a
// game event. M mutes; the context is created lazily on first use so the page
// never autoplays before the player interacts.
export function createAudio() {
  let ctx = null;
  let muted = false;
  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, delay) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + (delay ?? 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol ?? 0.12, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
  return {
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    click() { tone(660, 0.07, 'triangle', 0.08); },
    play() { tone(523, 0.09, 'triangle', 0.12); tone(784, 0.12, 'triangle', 0.1, 0.08); },
    draw() { tone(880, 0.05, 'sine', 0.06); },
    damage() { tone(196, 0.18, 'sawtooth', 0.1); tone(147, 0.22, 'sawtooth', 0.08, 0.05); },
    heal() { tone(523, 0.12, 'sine', 0.09); tone(659, 0.16, 'sine', 0.09, 0.09); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.11)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.1, i * 0.12)); },
  };
}
