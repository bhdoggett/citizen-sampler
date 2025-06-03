import { SampleEvent } from "../../../shared/types/audioTypes";

export const handler = async () => {
  const data: SampleEvent = {
    startTime: 0,
    duration: 0,
    note: "C4",
    velocity: 1,
  };
  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};
