import { config } from "dotenv";
config();

import { bool, cleanEnv, num, str } from "envalid";

export const envVars = cleanEnv(process.env, {
  PORT: num({ default: 3000 }),
  NODE_ENV: str({
    default: "development",
    choices: ["production", "development", "test"],
  }),
  LOG_LEVEL: str({
    choices: ["info", "debug", "error", "trace"],
    default: "info",
  }),
  CACHE_TTL: num({
    default: 3600,
    desc: "Cache expires in seconds. Default is 1 hour.",
  }),
});
