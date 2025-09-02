import { load } from "cheerio";
import { consts } from "./consts.js";
import { keyv as cache } from "./keyv.js";
import logger from "./pino.js";
import { z } from "zod";
import { to } from "await-to-js";

async function getHtml(
  url: string
): Promise<ReturnType<typeof load> | undefined> {
  logger.debug(`url: ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        // max-age 12 hours, revalidate after 6 hours
        "Cache-Control": "max-age=43200, stale-while-revalidate=21600",
      },
    });
    if (!res.ok) throw new Error("Failed to fetch html");
    const html = await res.text();
    const $ = load(html);
    return $;
  } catch (error) {
    logger.error(error);
  }

  return undefined;
}

async function fetchPoster(
  slug: string,
  altId?: string
): Promise<string | undefined> {
  const POSTER_URL = `https://letterboxd.com/film/${slug}/poster/std${
    altId ? `/${altId}` : "/125"
  }/?k=`;
  logger.warn(`Fetching poster from ${POSTER_URL}`);

  const shape = z.object({
    url: z.string().url(),
    url2x: z.string().url(),
  });

  const [resErr, res] = await to(fetch(POSTER_URL));
  if (resErr || !res.ok) {
    logger.error(
      `Error fetching poster for ${slug}: ${res?.status} - ${res?.statusText}`
    );
    if (resErr) {
      logger.error(resErr);
    }
    return;
  }

  const json = await res.json();

  const parsed = shape.safeParse(json);
  if (!parsed.success) {
    logger.error(`Error parsing poster JSON for ${slug}:`);
    logger.error(parsed.error);
    return;
  }

  // try to get the largest image possible
  const href = parsed.data.url2x ?? parsed.data.url;

  return href;
}

export const fetchInfo = async (
  slug: string
): Promise<
  | {
      slug: string;
      rating: number;
      poster: string;
      stars: string;
    }
  | undefined
> => {
  logger.debug(`slug: ${slug}`);

  logger.info(`Checking cache for ${slug}`);
  const cachedRating = await cache.get(slug);
  logger.info(`Cached rating for ${slug}? ${!!cachedRating}`);
  if (cachedRating) {
    logger.trace(`Cache hit for ${slug}`);
    logger.trace(cachedRating);
    return {
      slug,
      rating: cachedRating.rating,
      poster: cachedRating.poster,
      stars: `${cachedRating.rating} / 5`,
    };
  }

  try {
    const $rating = await getHtml(
      `https://letterboxd.com/csi/film/${slug}/ratings-summary/`
    );
    if (!$rating) return undefined;
    const rating = $rating("span.average-rating").text().trim();

    let poster = await fetchPoster(slug);
    if (!poster) {
      logger.warn("No poster found");
      poster = consts.errorImageUrl;
    }

    const stars = `${+rating}/5`;

    // set cache
    const rv = {
      rating: +rating,
      poster,
      stars,
    };

    cache.set(slug, rv);

    return {
      ...rv,
      poster,
      slug,
    };
  } catch (error) {
    logger.error(error);
  }

  return undefined;
};
