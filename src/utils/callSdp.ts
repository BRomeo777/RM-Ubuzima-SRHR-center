/**
 * Opus tuning for low-data, high-clarity voice calls.
 *
 * WebRTC defaults to roughly 32-40 kbps stereo-capable audio, which burns
 * ~15-18 MB per hour. These settings cut that dramatically while making the
 * voice MORE robust on weak connections, not less.
 *
 * How the saving is achieved:
 *
 * 1. `maxaveragebitrate` - caps the Opus payload. Opus is remarkably good at
 *    low rates for speech; 16 kbps wideband speech is clear and natural.
 *
 * 2. `usedtx=1` (Discontinuous Transmission) - the biggest real-world win.
 *    When nobody is speaking, Opus sends almost nothing instead of encoding
 *    silence. In a normal conversation each side is quiet well over half the
 *    time, so this roughly halves total usage again.
 *
 * 3. `ptime` - packets per second. Every packet carries 40 bytes of
 *    IP + UDP + RTP headers. At the default 20 ms that overhead alone is
 *    ~16 kbps, which can exceed the audio itself at low bitrates. Raising it
 *    to 60 ms cuts header overhead to ~5 kbps.
 *
 * 4. `useinbandfec=1` - Forward Error Correction. Opus embeds a low-bitrate
 *    copy of the previous frame, so a single lost packet can be reconstructed
 *    instead of becoming a gap. This is what keeps speech intelligible on poor
 *    mobile networks.
 *
 * 5. `maxplaybackrate` / `sprop-maxcapturerate` - 16 kHz wideband. Twice the
 *    frequency range of a normal phone call (which is 8 kHz narrowband), so it
 *    sounds clearer than a GSM call while using far less data than full band.
 *
 * 6. `stereo=0` - voice is mono; stereo would double the cost for nothing.
 */

export interface AudioTuning {
  /** Opus payload cap in kbps. */
  bitrateKbps: number;
  /** Packet duration in ms. Higher = less header overhead, slightly more latency. */
  ptimeMs: number;
  /** Audio bandwidth in Hz. 16000 = wideband speech. */
  maxSampleRate: number;
}

/**
 * Default profile: clear wideband speech at a fraction of typical VoIP data.
 *
 * Expected usage per hour of a real conversation, per participant:
 *   payload  16 kbps
 *   headers  ~5 kbps  (at 60 ms packets)
 *   total    ~21 kbps continuous  = ~9.5 MB/hour of NON-STOP talking
 *   with DTX and normal conversational pauses: roughly 3-5 MB/hour
 */
export const LOW_DATA_TUNING: AudioTuning = {
  bitrateKbps: 16,
  ptimeMs: 60,
  maxSampleRate: 16000,
};

/** Even leaner, for very constrained networks. Slightly less rich. */
export const ULTRA_LOW_DATA_TUNING: AudioTuning = {
  bitrateKbps: 10,
  ptimeMs: 100,
  maxSampleRate: 16000,
};

/**
 * Rewrite an SDP so Opus is configured for low-bitrate, loss-resilient speech.
 * Safe to call on both offers and answers.
 */
export function tuneAudioSdp(sdp: string, tuning: AudioTuning = LOW_DATA_TUNING): string {
  const opusPayloadTypes = findOpusPayloadTypes(sdp);
  if (opusPayloadTypes.length === 0) {
    console.warn('[callSdp] No Opus codec found; leaving SDP untouched.');
    return sdp;
  }

  const params = [
    `maxaveragebitrate=${tuning.bitrateKbps * 1000}`,
    `maxplaybackrate=${tuning.maxSampleRate}`,
    `sprop-maxcapturerate=${tuning.maxSampleRate}`,
    'stereo=0',
    'sprop-stereo=0',
    'usedtx=1',
    'useinbandfec=1',
    // Variable bitrate lets Opus spend less on easy passages.
    'cbr=0',
  ];

  let lines = sdp.split(/\r\n|\n/);

  for (const pt of opusPayloadTypes) {
    lines = upsertFmtp(lines, pt, params);
  }

  lines = setPacketTime(lines, tuning.ptimeMs);

  return lines.join('\r\n');
}

/** Opus can appear more than once (e.g. with RED); tune every instance. */
function findOpusPayloadTypes(sdp: string): string[] {
  const types: string[] = [];
  const pattern = /^a=rtpmap:(\d+)\s+opus\/\d+\/\d+/gim;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sdp)) !== null) {
    types.push(match[1]);
  }
  return types;
}

/**
 * Merge our parameters into an existing `a=fmtp` line for this payload type,
 * or insert one if absent. Existing keys we care about are replaced; any other
 * keys the browser set are preserved.
 */
function upsertFmtp(lines: string[], payloadType: string, params: string[]): string[] {
  const prefix = `a=fmtp:${payloadType} `;
  const index = lines.findIndex((line) => line.startsWith(prefix));

  const ourKeys = new Set(params.map((p) => p.split('=')[0]));

  if (index === -1) {
    // No fmtp line yet: add one straight after the matching rtpmap.
    const rtpmapIndex = lines.findIndex((line) =>
      line.startsWith(`a=rtpmap:${payloadType} `)
    );
    if (rtpmapIndex === -1) return lines;

    const updated = [...lines];
    updated.splice(rtpmapIndex + 1, 0, prefix + params.join(';'));
    return updated;
  }

  const existing = lines[index]
    .slice(prefix.length)
    .split(';')
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !ourKeys.has(p.split('=')[0]));

  const updated = [...lines];
  updated[index] = prefix + [...existing, ...params].join(';');
  return updated;
}

/**
 * Set `a=ptime` / `a=maxptime` on the audio media section. This is the lever
 * that reduces per-packet header overhead.
 */
function setPacketTime(lines: string[], ptimeMs: number): string[] {
  const audioIndex = lines.findIndex((line) => line.startsWith('m=audio'));
  if (audioIndex === -1) return lines;

  // The audio section runs until the next m= line.
  let sectionEnd = lines.findIndex(
    (line, i) => i > audioIndex && line.startsWith('m=')
  );
  if (sectionEnd === -1) sectionEnd = lines.length;

  const withoutOld = lines.filter((line, i) => {
    if (i <= audioIndex || i >= sectionEnd) return true;
    return !line.startsWith('a=ptime:') && !line.startsWith('a=maxptime:');
  });

  // Recompute the insertion point after the removals.
  const insertAt = withoutOld.findIndex((line) => line.startsWith('m=audio')) + 1;

  const updated = [...withoutOld];
  updated.splice(insertAt, 0, `a=ptime:${ptimeMs}`, `a=maxptime:${ptimeMs * 2}`);
  return updated;
}

/**
 * Enforce the bitrate cap on the sender as well.
 *
 * SDP `maxaveragebitrate` is a hint to the encoder; this is an explicit cap
 * the browser honours, so the two together are reliable.
 */
export async function applySenderBitrate(
  sender: RTCRtpSender,
  tuning: AudioTuning = LOW_DATA_TUNING
): Promise<void> {
  try {
    const parameters = sender.getParameters();

    // Older browsers can return parameters without encodings populated.
    if (!parameters.encodings || parameters.encodings.length === 0) {
      parameters.encodings = [{}];
    }

    for (const encoding of parameters.encodings) {
      encoding.maxBitrate = tuning.bitrateKbps * 1000;
      // Deprioritise nothing; voice is the only stream, keep it high priority
      // so it wins bandwidth over background traffic.
      encoding.priority = 'high';
      encoding.networkPriority = 'high';
    }

    await sender.setParameters(parameters);
  } catch (error) {
    // Not fatal: the SDP cap still applies.
    console.warn('[callSdp] Could not apply sender bitrate cap:', error);
  }
}

/** Human-readable data estimate, used in the call UI. */
export function estimateDataUsage(seconds: number, tuning: AudioTuning = LOW_DATA_TUNING): string {
  const headerKbps = (40 * 8) / (tuning.ptimeMs / 1000) / 1000;
  const totalKbps = tuning.bitrateKbps + headerKbps;

  // DTX means real conversations transmit roughly half the time per direction.
  const dtxFactor = 0.55;
  const megabytes = (totalKbps * 1000 * seconds * dtxFactor) / 8 / 1_000_000;

  if (megabytes < 1) return `${Math.round(megabytes * 1000)} KB`;
  return `${megabytes.toFixed(1)} MB`;
}
