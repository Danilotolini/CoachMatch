import express, { json } from "express";
import serverless from "serverless-http";
import coach from "./routes/coaches.js";


const app = express();

app.use(json());
app.use(coach);

export const handler = serverless(app);
