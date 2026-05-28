import express, { json } from "express";
import serverless from "serverless-http";
import coach from "./routes/coaches.js";
import goals from "./routes/goals.js";
import modalities from "./routes/modalities.js";

const app = express();

app.use(json());
app.use(coach);
app.use(goals);
app.use(modalities);

export const handler = serverless(app);