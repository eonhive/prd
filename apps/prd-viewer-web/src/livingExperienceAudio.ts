/*
 * Company: EonHive Inc. | Title: Living Homepage Ambient Audio
 * Purpose: Lazily create a quiet, seamless original tone bed for the uRK audio transport.
 * Author: Stan Nesi | Created: October 26, 2026 | Updated: October 26, 2026
 * Notes: Vibe coded with Codex.
 */

export function createAmbientAudioUrl(): string {
  const sampleRate = 16000;
  const seconds = 8;
  const samples = sampleRate * seconds;
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  function writeText(offset: number, text: string) {
    for (let index = 0; index < text.length; index++)
      view.setUint8(offset + index, text.charCodeAt(index));
  }
  writeText(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  writeText(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples * 2, true);
  for (let index = 0; index < samples; index++) {
    const time = index / sampleRate;
    const envelope = Math.sin((Math.PI * time) / seconds) ** 2;
    const tone =
      Math.sin(time * Math.PI * 2 * 110) * 0.08 +
      Math.sin(time * Math.PI * 2 * 165) * 0.045 +
      Math.sin(time * Math.PI * 2 * 220) * 0.025;
    view.setInt16(44 + index * 2, Math.round(tone * envelope * 32767), true);
  }
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}
