import { z } from "zod";
import { Result } from "./result.type.js";
import logger from "./pino.js";

export const ConfigSchema = z.object({
  ratingType: z.enum(["stars", "numbers"]).default("stars"),
});
export type Config = z.infer<typeof ConfigSchema>;

// encode and decode base64 json
export const config = {
  encode: (config: Config) => btoa(JSON.stringify(config)),
  decode: (encoded: string): Result<Config> => {
    const parsed = JSON.parse(atob(encoded));
    const result = ConfigSchema.safeParse(parsed);
    if (!result.success) {
      logger.error("Invalid config", result.error);
      return { success: false, message: "Invalid config" };
    }

    return { success: true, data: result.data };
  },
};
