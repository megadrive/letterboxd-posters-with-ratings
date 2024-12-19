import { config } from "dotenv";
config();

import { cleanEnv, num, str } from "envalid";

export const envVars = cleanEnv(process.env, {
  PORT: num({ default: 3000 }),
  DATABASE_URL: str({ default: "file://./db.sqlite" }),
});
