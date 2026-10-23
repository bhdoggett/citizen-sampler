"use client";
import * as Tone from "tone";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAudioContext } from "../../app/contexts/AudioContext";
import {
  getCollectionArrayFromName,
  collectionNames,
} from "../../lib/loc_collections";
import {
  DrumMachineId,
  drumMachines,
  drumMachineNames,
  getDrumMachineKeyByName,
  getKitSampleTitle,
  drumUrl,
} from "src/lib/drumMachines";
import { useUIContext } from "src/app/contexts/UIContext";
import { getTitle } from "../../lib/getTitle";
import { SampleTypeFE } from "src/types/audioTypesFE";
import dialog from "./Dialog.module.css";
import styles from "./ChooseSample.module.css";
import OptionList from "./OptionList";
import SamplePreview, { type PreviewState } from "./SamplePreview";
import { extractPeaks } from "src/lib/audio/decodeAudio";

const ChooseSample: React.FC = () => {
  const {
    selectedSampleId,
    allSampleData,
    loadSamplersToRef,
    updateSamplerData,
  } = useAudioContext();
  const { setShowDialog } = useUIContext();
  const [type, setType] = useState<"loc" | "kit" | null>(null);
  const [sampleGroup, setSampleGroup] = useState<string | null>(null);
  const [samplesArray, setSamplesArray] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const currentPlayer = useRef<Tone.Player | null>(null);
  const groupNames = type === "loc" ? collectionNames : drumMachineNames;

  // Stop demo sample playback
  const stopAndDisposePlayer = () => {
    if (currentPlayer.current) {
      currentPlayer.current.stop();
      currentPlayer.current.dispose();
      currentPlayer.current = null;
    }
  };

  const isPreviewPlaying = useCallback(
    () => currentPlayer.current?.state === "started",
    [],
  );

  // Play sample demo audio and show its waveform once the buffer loads
  const playSample = (url: string) => {
    stopAndDisposePlayer();
    if (!type) return;
    const player = new Tone.Player(type === "kit" ? drumUrl(url) : url, () => {
      if (currentPlayer.current !== player) return;
      const buffer = player.buffer.get();
      if (!buffer) return;
      setPreview({
        peaks: extractPeaks(buffer, 1000, true),
        duration: buffer.duration,
        startedAt: Tone.now(),
      });
    }).toDestination();
    player.autostart = true;
    currentPlayer.current = player;
  };

  // For populating the samples menu
  const formatLocSampleName = (url?: string) => {
    if (!url) return "";
    if (type === "loc") {
      const filename = url.split("/").pop();
      if (!filename) return "";
      const titleParts = filename.split("_");
      const gatheredParts = [
        titleParts[0],
        Number(titleParts[2]).toString(),
      ].join(" ");
      const title = gatheredParts.replace(/-/g, " ");
      return title.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  const handleSelectSampleGroup = (collection: string) => {
    setSampleGroup(collection);
    setSelectedIndex(null);
    setPreview(null);
  };

  // Update allSampleData and samplersRef when a new sample is chosen
  const handleChooseSample = () => {
    if (
      selectedIndex === null ||
      !sampleGroup ||
      !samplesArray[selectedIndex] ||
      !selectedSampleId
    )
      return;

    const sampleSource = samplesArray[selectedIndex];
    const url =
      type === "loc"
        ? sampleSource
        : drumUrl(sampleSource);
    const existing = allSampleData[selectedSampleId];
    if (!existing) return;

    const updatedData: SampleTypeFE = {
      ...existing,
      url,
      title:
        type === "loc" ? getTitle(url) : getKitSampleTitle(sampleSource),
      type: type!,
      collectionName: sampleGroup,
      attribution: type === "loc" ? "" : existing.attribution,
    };
    updateSamplerData(selectedSampleId, updatedData);
    loadSamplersToRef({ [selectedSampleId]: updatedData });
    setShowDialog(null);
  };

  useEffect(() => {
    if (type === "loc" && sampleGroup) {
      setSamplesArray(getCollectionArrayFromName(sampleGroup));
    }
    if (type === "kit" && sampleGroup) {
      setSamplesArray(
        drumMachines[getDrumMachineKeyByName(sampleGroup) as DrumMachineId]
          .samples
      );
    }
  }, [sampleGroup, type]);

  const getSampleLabel = (sample: string) =>
    type === "loc"
      ? (formatLocSampleName(sample) ?? "")
      : sample.split(".")[0].split("__")[1];

  // Filter keeps each sample's index in samplesArray, which selection uses
  const needle = query.trim().toLowerCase();
  const visibleSamples = samplesArray
    .map((sample, index) => ({ sample, index }))
    .filter(({ sample }) => getSampleLabel(sample).toLowerCase().includes(needle));
  const visibleSelected = visibleSamples.findIndex(
    ({ index }) => index === selectedIndex,
  );

  return (
    <div className={dialog.form}>
      <h2 className={dialog.title}>Choose Sample</h2>

      {type === null && (
        <div className={styles.sourcePicker}>
          <button
            type="button"
            onClick={() => {
              setType("loc");
              setSampleGroup(collectionNames[0]);
            }}
            className={`${dialog.button} ${styles.source}`}
          >
            Library of Congress
          </button>
          <button
            type="button"
            onClick={() => {
              setType("kit");
              setSampleGroup(drumMachineNames[0]);
            }}
            className={`${dialog.button} ${styles.source}`}
          >
            Drum Machines
          </button>
        </div>
      )}

      {type && (
        <>
          {/* Group on the left, its samples on the right, like a file browser */}
          <div className={styles.browser}>
            <div className={dialog.field}>
              <span className={dialog.label}>
                {type === "loc" ? "Collection" : "Drum machine"}
              </span>
              <OptionList
                name="sample-group"
                label={type === "loc" ? "Collection" : "Drum machine"}
                items={groupNames}
                selectedIndex={sampleGroup ? groupNames.indexOf(sampleGroup) : null}
                onSelect={(_, group) => handleSelectSampleGroup(group)}
              />
            </div>
            <div className={dialog.field}>
              <span className={dialog.label}>
                Samples
                {needle && ` · ${visibleSamples.length} of ${samplesArray.length}`}
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter samples"
                aria-label="Filter samples"
                className={`${dialog.input} ${styles.filter}`}
              />
              {visibleSamples.length > 0 ? (
                <OptionList
                  name="samples"
                  label="Samples"
                  items={visibleSamples.map(({ sample }) => sample)}
                  selectedIndex={visibleSelected === -1 ? null : visibleSelected}
                  onSelect={(position, sample) => {
                    setSelectedIndex(visibleSamples[position].index);
                    playSample(sample);
                  }}
                  onBlur={stopAndDisposePlayer}
                  getLabel={getSampleLabel}
                />
              ) : (
                <p className={styles.empty}>No samples match “{query}”</p>
              )}
            </div>
            <SamplePreview
              preview={preview}
              isPlaying={isPreviewPlaying}
              onReplay={() => {
                if (selectedIndex !== null) playSample(samplesArray[selectedIndex]);
              }}
            />
          </div>
          <div className={`${dialog.actions} ${styles.footer}`}>
            <button
              type="button"
              className={dialog.button}
              onClick={() => {
                stopAndDisposePlayer();
                setPreview(null);
                setType(null);
              }}
            >
              ← Back
            </button>
            <button
              type="button"
              className={`${dialog.button} ${dialog.primary}`}
              onClick={handleChooseSample}
              disabled={selectedIndex === null}
            >
              Choose Sample
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ChooseSample;
