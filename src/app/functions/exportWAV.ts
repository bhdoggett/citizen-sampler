import * as Tone from "tone";
import { SampleData } from "../types/SampleData";

export const exportWAV = async (
  allSampleData: SampleData[],
  loopLength: number, // New parameter for loop length
  extraTime: number = 0
) => {
  // Use loopLength directly for the total duration
  const totalDuration = loopLength;

  // Add extra time (e.g., for delay/reverb tail)
  const offlineContextDuration = totalDuration + extraTime;

  // Create the OfflineContext with the adjusted duration
  const offlineContext = new Tone.OfflineContext(
    2,
    offlineContextDuration,
    44100
  ); // 2 channels, duration in seconds, sample rate

  // Create the audio content in the OfflineContext
  allSampleData.forEach((sample) => {
    sample.times.forEach(({ startTime, duration }) => {
      offlineContext.triggerAttackRelease(sample, duration, startTime); // Adjust this based on how you're triggering sounds
    });
  });

  // Render the audio and convert to WAV
  const buffer = await offlineContext.render();
  const wavData = audioBufferToWav(buffer);
  const blob = new Blob([wavData], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);

  // Create download link and trigger download
  const a = document.createElement("a");
  a.href = url;
  a.download = "audio.wav";
  a.click();
};

export const audioBufferToWav = (buffer: AudioBuffer) => {
  const numOfChannels = buffer.numberOfChannels;
  const length = buffer.length * numOfChannels * 2 + 44;
  const output = new DataView(new ArrayBuffer(length));

  const writeString = (str: string, offset: number) => {
    for (let i = 0; i < str.length; i++) {
      output.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  const writeUInt16 = (value: number, offset: number) => {
    output.setUint16(offset, value, true);
  };

  const writeUInt32 = (value: number, offset: number) => {
    output.setUint32(offset, value, true);
  };

  const writeFloat32 = (value: number, offset: number) => {
    output.setFloat32(offset, value, true);
  };

  // RIFF header
  writeString("RIFF", 0);
  writeUInt32(length - 8, 4); // file size
  writeString("WAVE", 8);

  // fmt chunk
  writeString("fmt ", 12);
  writeUInt32(16, 16); // size of fmt chunk
  writeUInt16(1, 20); // format (PCM)
  writeUInt16(numOfChannels, 22); // number of channels
  writeUInt32(buffer.sampleRate, 24); // sample rate
  writeUInt32(buffer.sampleRate * numOfChannels * 2, 28); // byte rate
  writeUInt16(numOfChannels * 2, 32); // block align
  writeUInt16(16, 34); // bit depth

  // data chunk
  writeString("data", 36);
  writeUInt32(buffer.length * numOfChannels * 2, 40); // data size

  let offset = 44;
  for (let channel = 0; channel < numOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < buffer.length; i++) {
      const sample = channelData[i];
      const intSample = Math.max(-1, Math.min(1, sample)) * 0x7fff; // 16-bit PCM
      output.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return output.buffer.slice(0);
};
