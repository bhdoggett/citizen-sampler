import Recorder from "recorder-js";

const exportWAVFromRecorder = (
  recorder: Recorder,
  filename = "audio_stem.wav"
) => {
  recorder.exportWAV((blob: Blob) => {
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;

    document.body.appendChild(a);
    a.click();

    // Optional cleanup for good practice
    window.URL.revokeObjectURL(url);
  });
};

export default exportWAVFromRecorder;
