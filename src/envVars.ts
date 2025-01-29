import { config } from "dotenv";
config();

import { bool, cleanEnv, num, str } from "envalid";

export const envVars = cleanEnv(process.env, {
  PORT: num({ default: 3000 }),
  DATABASE_URL: str({ default: "file://./db.sqlite" }),
  SHOULD_CACHE: bool({ default: true }),
  // 1 day
  CACHE_EXPIRES: num({ default: 86400 }),
});
