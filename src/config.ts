import { z } from "zod";

export const ConfigSchema = z.object({
  ratingType: z.enum(["stars", "numbers"]).default("stars"),
});
export type Config = z.infer<typeof ConfigSchema>;

// encode and decode base64 json
export const config = {
  encode: (config: Config) => btoa(JSON.stringify(config)),
  decode: (encoded: string) => {
    const parsed = JSON.parse(atob(encoded));
    return ConfigSchema.safeParse(parsed);
  },
};
