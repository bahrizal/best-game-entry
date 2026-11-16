// All sound is synthesized with WebAudio: no audio files, no network. The context is
// created lazily on the first player gesture (browsers demand that) and every call is
// a no-op until then, so headless screenshot runs stay silent and safe.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c || c.state === 'suspended') return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      const t = c.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  function arpeggio(notes, step, type, vol) {
    notes.forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.14, type, vol), i * step);
    });
  }

  return {
    unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone(880, 0.06, 'square', 0.05, 440);
    },
    hit() {
      tone(220, 0.05, 'triangle', 0.08, 110);
    },
    explode() {
      tone(160, 0.25, 'sawtooth', 0.12, 40);
    },
    pickup() {
      tone(660, 0.07, 'sine', 0.07, 990);
    },
    hurt() {
      tone(200, 0.2, 'sawtooth', 0.14, 60);
    },
    levelup() {
      arpeggio([523, 659, 784, 1046], 70, 'sine', 0.1);
    },
    horn() {
      tone(110, 0.4, 'sawtooth', 0.1, 165);
    },
    boss() {
      tone(55, 0.5, 'sawtooth', 0.16, 50);
      setTimeout(() => tone(55, 0.5, 'sawtooth', 0.16, 50), 500);
    },
    win() {
      arpeggio([523, 659, 784, 1046, 1318], 90, 'triangle', 0.12);
    },
  };
}
