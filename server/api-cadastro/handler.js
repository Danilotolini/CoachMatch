import express, { json } from "express";
import serverless from "serverless-http";
import coach from "./routes/coaches.js";
import goals from "./routes/goals.js";
import modalities from "./routes/modalities.js";

export const createApp = () => {
  const app = express();
  app.use(json());
  app.use(coach);
  app.use(goals);
  app.use(modalities);
  return app;
};

export const handler = serverless(createApp());
