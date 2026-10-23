"use client";
import * as Tone from "tone";
import { useState, useEffect, useRef } from "react";
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

  // Play sample demo audio
  const playSample = (url: string) => {
    stopAndDisposePlayer();
    if (type === "loc") {
      currentPlayer.current = new Tone.Player(url).toDestination();
    }

    if (type === "kit") {
      currentPlayer.current = new Tone.Player(drumUrl(url)).toDestination();
    }
    if (currentPlayer.current) currentPlayer.current.autostart = true;
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
              <span className={dialog.label}>Samples</span>
              <OptionList
                name="samples"
                label="Samples"
                items={samplesArray}
                selectedIndex={selectedIndex}
                onSelect={(index, sample) => {
                  setSelectedIndex(index);
                  playSample(sample);
                }}
                onBlur={stopAndDisposePlayer}
                getLabel={(sample) =>
                  type === "loc"
                    ? (formatLocSampleName(sample) ?? "")
                    : sample.split(".")[0].split("__")[1]
                }
              />
            </div>
          </div>
          <div className={`${dialog.actions} ${styles.footer}`}>
            <button
              type="button"
              className={dialog.button}
              onClick={() => setType(null)}
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
