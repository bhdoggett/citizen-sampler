import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { api, apiErrorMessage, getSong, isAuthRejection, updateSong } from "./client";
import type { SongPayload } from "./client";

const serverError = (data: unknown, status = 400) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    data,
    status,
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

describe("isAuthRejection", () => {
  it("is true when the server rejects the token", () => {
    expect(isAuthRejection(serverError({}, 401))).toBe(true);
    expect(isAuthRejection(serverError({}, 403))).toBe(true);
  });

  it("is false when the server is down or unreachable", () => {
    expect(isAuthRejection(serverError("<html>Bad Gateway</html>", 502))).toBe(false);
    expect(isAuthRejection(serverError({ message: "DB down" }, 500))).toBe(false);
    expect(isAuthRejection(networkError())).toBe(false);
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

describe("getSong", () => {
  afterEach(() => vi.restoreAllMocks());

  it("encodes the title so punctuation stays in the path segment", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: {} });
    await getSong("tok", "Why? / Now");
    expect(get).toHaveBeenCalledWith("/beats/me/songs/Why%3F%20%2F%20Now", {
      headers: { Authorization: "Bearer tok" },
    });
  });
});
