import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { api, apiErrorMessage, isServerError, updateSong } from "./client";
import type { SongPayload } from "./client";

const serverError = (data: unknown) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    data,
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

const networkError = () => new AxiosError("Network Error", "ERR_NETWORK");

describe("apiErrorMessage", () => {
  it("uses the server's message when there is one", () => {
    expect(apiErrorMessage(serverError({ message: "Nope" }), "fallback")).toBe("Nope");
  });

  it("falls back when the server never answered", () => {
    expect(apiErrorMessage(networkError(), "fallback")).toBe("fallback");
  });

  it("falls back for errors that are not from axios", () => {
    expect(apiErrorMessage(new Error("x"), "fallback")).toBe("fallback");
  });
});

describe("isServerError", () => {
  it("is true only when the server responded", () => {
    expect(isServerError(serverError({}))).toBe(true);
    expect(isServerError(networkError())).toBe(false);
  });
});

describe("updateSong", () => {
  afterEach(() => vi.restoreAllMocks());

  it("PUTs the song with the bearer token and returns the response body", async () => {
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: { message: "ok" } });
    const payload = { song: { title: "t", loops: {}, samples: {} }, userId: "u" } as unknown as SongPayload;

    await expect(updateSong("tok", "id1", payload)).resolves.toEqual({ message: "ok" });
    expect(put).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledWith("/beats/me/songs/id1", payload, {
      headers: { Authorization: "Bearer tok" },
    });
  });
});
