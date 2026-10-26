import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { SampleTypeFE } from "src/types/audioTypesFE";
import useMutesAndSolos from "./useMutesAndSolos";

type AllSampleData = Record<string, SampleTypeFE>;
type Updater = (prev: AllSampleData) => AllSampleData;

let state: AllSampleData;
const setAllSampleData = vi.fn((updater: Updater) => {
  state = updater(state);
});

vi.mock("../contexts/AudioContext", () => ({
  useAudioContext: () => ({
    allSampleData: state,
    setAllSampleData,
    solosExist: false,
  }),
}));

const sample = (id: string, solo = false, mute = false) =>
  ({ id, settings: { solo, mute, volume: 0 } }) as unknown as SampleTypeFE;

describe("useMutesAndSolos", () => {
  beforeEach(() => {
    state = { a: sample("a", true), b: sample("b", true), c: sample("c") };
    setAllSampleData.mockClear();
  });

  it("sets mute on one sample only", () => {
    const { result } = renderHook(() => useMutesAndSolos());
    result.current.setSampleMute("a", true);
    expect(state.a.settings.mute).toBe(true);
    expect(state.b.settings.mute).toBe(false);
  });

  it("sets solo without touching other settings", () => {
    const { result } = renderHook(() => useMutesAndSolos());
    result.current.setSampleSolo("c", true);
    expect(state.c.settings).toEqual({ solo: true, mute: false, volume: 0 });
  });

  it("turns solo off when a pad is muted", () => {
    const { result } = renderHook(() => useMutesAndSolos());
    result.current.setSampleMute("a", true);
    expect(state.a.settings).toMatchObject({ mute: true, solo: false });
  });

  it("turns mute off when a pad is soloed", () => {
    state.c = sample("c", false, true);
    const { result } = renderHook(() => useMutesAndSolos());
    result.current.setSampleSolo("c", true);
    expect(state.c.settings).toMatchObject({ mute: false, solo: true });
  });

  it("leaves solo alone when a pad is unmuted", () => {
    const { result } = renderHook(() => useMutesAndSolos());
    result.current.setSampleMute("b", false);
    expect(state.b.settings).toMatchObject({ mute: false, solo: true });
  });

  it("clears every solo", () => {
    const { result } = renderHook(() => useMutesAndSolos());
    result.current.clearSolos();
    expect(Object.values(state).map((s) => s.settings.solo)).toEqual([
      false,
      false,
      false,
    ]);
  });
});
