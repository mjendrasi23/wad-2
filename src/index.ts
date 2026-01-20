import express from "express";
import morgan from "morgan";
import { config } from "dotenv";

import { APP_VERSION } from "./shared/version";
import { errorHandler } from "./helpers/errors";
import { openDb as openSysDb } from "./helpers/sysdb";
import { openDb } from "./helpers/db";
import { authRouter, initAuth } from "./helpers/auth";
import { uploadRouter } from "./helpers/fileupload";
import { userRouter } from "./api/userRouter";
import { recipeRouter } from "./api/recipeRouter";
import { metaRouter } from "./api/metaRouter";
import { interactionRouter } from "./api/interactionRouter";
import { adminRouter } from "./api/adminRouter";

config({ quiet: true });

const app = express();

// log http requests
app.use(morgan(process.env.MORGANTYPE || "tiny"));

// CORS (needed for local dev when frontend runs on a different port)
const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:4200")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (origin && (corsOrigins.includes("*") || corsOrigins.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// static files (angular app)
const frontendPath = process.env.FRONTEND || "./frontend/dist/frontend/browser";
app.use(express.static(frontendPath));
// static uploaded files
app.use("/uploads", express.static(process.env.UPLOADSDIR || "./uploads"));
// static pictures (placeholders/icons)
app.use("/pictures", express.static(process.env.PICTURESDIR || "./pictures"));

// api url prefix
const apiUrl = process.env.APIURL || "/api";

// automatic parsing of json payloads
app.use(express.json());

async function main() {
  await openSysDb();
  console.log("System database connected");

  await initAuth(app);
  console.log("Initialize authorization framework");

  await openDb();
  console.log("Main database connected");

  // auth router
  app.use(apiUrl + "/auth", authRouter);

  // file upload router
  app.use(apiUrl + "/upload", uploadRouter);

  app.use(apiUrl + "/users", userRouter);

  app.use(apiUrl + "/recipes", recipeRouter);

  app.use(apiUrl, adminRouter);

  app.use(apiUrl, metaRouter);

  app.use(apiUrl, interactionRouter);

  // install our error handler (must be the last app.use)
  app.use(errorHandler);

  const port = process.env.PORT || 12157;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

console.log(`Backend ${APP_VERSION} is starting...`);
main().catch((err) => {
  console.error("ERROR startup failed due to", err);
});
