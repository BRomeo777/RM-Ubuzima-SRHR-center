/**
 * Realtime pitch-shifting AudioWorklet for anonymised calls.
 *
 * Uses a crossfading variable-delay line (granular pitch shift). Unlike the
 * `playbackRate` resampling used for voice notes, this shifts pitch while
 * PRESERVING TEMPO, so live speech stays intelligible and conversational.
 *
 * How it works: a read head moves through a circular buffer at `pitchRatio`
 * times the write speed. That alone would create a click each time the head
 * wraps, so two read heads are kept half a grain apart and crossfaded with
 * triangular windows whose weights always sum to 1.
 *
 * Latency is bounded by one grain (~21ms at 48kHz), which is acceptable for
 * conversation.
 */

const GRAIN = 1024; // samples per grain; smaller = lower latency, more artifacts
const BUFFER_SIZE = 4096; // must be comfortably larger than GRAIN

class PitchShiftProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'pitchRatio',
        defaultValue: 1.0,
        minValue: 0.5,
        maxValue: 2.0,
        automationRate: 'k-rate',
      },
    ];
  }

  constructor() {
    super();
    this.buffer = new Float32Array(BUFFER_SIZE);
    this.writeIdx = 0;
    this.delay = 0; // fractional delay within [0, GRAIN)
  }

  /** Read the buffer at a fractional delay behind the write head. */
  readInterpolated(delay) {
    let pos = this.writeIdx - delay;
    while (pos < 0) pos += BUFFER_SIZE;
    while (pos >= BUFFER_SIZE) pos -= BUFFER_SIZE;

    const i0 = Math.floor(pos);
    const frac = pos - i0;
    const i1 = i0 + 1 >= BUFFER_SIZE ? 0 : i0 + 1;

    return this.buffer[i0] * (1 - frac) + this.buffer[i1] * frac;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    // No input yet (mic still warming up) — keep the processor alive.
    if (!input || input.length === 0 || !input[0]) {
      return true;
    }

    const inChannel = input[0];
    const ratio = parameters.pitchRatio[0];
    const frames = inChannel.length;

    // Bypass entirely when no shift is requested, so "real voice" mode is
    // bit-exact and adds no artifacts.
    if (ratio === 1) {
      for (let c = 0; c < output.length; c++) {
        output[c].set(inChannel);
      }
      // Keep the buffer primed so toggling mid-call doesn't pop.
      for (let i = 0; i < frames; i++) {
        this.buffer[this.writeIdx] = inChannel[i];
        this.writeIdx = this.writeIdx + 1 >= BUFFER_SIZE ? 0 : this.writeIdx + 1;
      }
      return true;
    }

    const half = GRAIN * 0.5;
    const out = output[0];

    for (let i = 0; i < frames; i++) {
      this.buffer[this.writeIdx] = inChannel[i];

      const p1 = this.delay;
      let p2 = p1 + half;
      if (p2 >= GRAIN) p2 -= GRAIN;

      // Triangular windows, 50% overlapped, so w1 + w2 === 1.
      const w1 = 1 - Math.abs((2 * p1) / GRAIN - 1);
      const w2 = 1 - Math.abs((2 * p2) / GRAIN - 1);

      out[i] = w1 * this.readInterpolated(p1) + w2 * this.readInterpolated(p2);

      // Advance the read head relative to the write head.
      this.delay -= ratio - 1;
      if (this.delay < 0) this.delay += GRAIN;
      else if (this.delay >= GRAIN) this.delay -= GRAIN;

      this.writeIdx = this.writeIdx + 1 >= BUFFER_SIZE ? 0 : this.writeIdx + 1;
    }

    // Mirror to any additional output channels.
    for (let c = 1; c < output.length; c++) {
      output[c].set(out);
    }

    return true;
  }
}

registerProcessor('pitch-shift-processor', PitchShiftProcessor);
