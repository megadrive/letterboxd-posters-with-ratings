import pino from "pino";
import pretty from "pino-pretty";
import { envVars } from "./envVars.js";

export default pino.default(
  {
    level: envVars.LOG_LEVEL || "info",
  },
  envVars.NODE_ENV === "production" ? undefined : pretty()
);
