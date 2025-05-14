import Keyv from "keyv";
import QuickLRU from "quick-lru";
import { envVars } from "./envVars.js";

const quickLru = new QuickLRU({
  maxSize: 1000,
  maxAge: envVars.CACHE_TTL,
});

type KeyvType = {
  rating: number;
  poster: string;
  stars: string;
};
let keyvClient: InstanceType<typeof Keyv<KeyvType>> | undefined = undefined;

export const keyv = (() => {
  if (!keyvClient) {
    keyvClient = new Keyv<KeyvType>({
      store: quickLru,
    });
  }

  return keyvClient;
})();
