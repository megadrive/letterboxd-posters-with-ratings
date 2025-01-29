import { envVars } from "./envVars";
import { prisma } from "./prisma";

export const cache = {
  get: async (slug: string) => {
    if (envVars.SHOULD_CACHE === false) {
      return undefined;
    }

    const rating = await prisma.rating.findFirst({
      where: {
        slug,
      },
    });

    if (!rating) {
      return undefined;
    }

    // return undefined if expired after 1 day
    if (
      rating.lastUpdated.getTime() + envVars.CACHE_EXPIRES * 1000 <
      Date.now()
    ) {
      console.warn(`Cache expired for ${slug}`);
      return undefined;
    }

    return rating;
  },
  set: async (data: { slug: string; rating: number; poster: string }) => {
    if (envVars.SHOULD_CACHE === false) {
      return undefined;
    }

    const { slug, rating, poster } = data;

    await prisma.rating.upsert({
      where: {
        slug,
      },
      update: {
        rating,
        posterUrl: poster,
      },
      create: {
        slug,
        rating,
        posterUrl: poster,
      },
    });
  },
};
