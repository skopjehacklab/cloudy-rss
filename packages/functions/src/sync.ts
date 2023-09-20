import { ApiHandler } from "sst/node/api";

export const get = ApiHandler(async (_evt) => {
  return {
    statusCode: 200,
    body: `Hello world. The time is ${new Date().toISOString()}`,
  };
});

export const post = ApiHandler(async (_evt) => {
  return {
    statusCode: 200,
    body: `Hello world. The time is ${new Date().toISOString()}`,
  };
});
