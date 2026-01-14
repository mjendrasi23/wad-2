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

config({ quiet: true });

const app = express();

// log http requests
app.use(morgan(process.env.MORGANTYPE || "tiny"));

// static files (angular app)
const frontendPath = process.env.FRONTEND || "./frontend/dist/frontend/browser";
app.use(express.static(frontendPath));
// static uploaded files
app.use("/uploads", express.static(process.env.UPLOADSDIR || "./uploads"));

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
  app.use("/api/auth", authRouter);

  // file upload router
  app.use(apiUrl + "/upload", uploadRouter);

  app.use(apiUrl + "/users", userRouter);

  app.use(apiUrl + "/recipes", recipeRouter);

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
