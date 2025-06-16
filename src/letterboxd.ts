import { load } from "cheerio";
import { consts } from "./consts.js";
import { keyv as cache } from "./keyv.js";
import logger from "./pino.js";

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

    const $poster = await getHtml(
      `https://letterboxd.com/ajax/poster/film/${slug}/hero/230x345/?k=_45aa59a6`
    );
    if (!$poster) return undefined;
    let poster = $poster("img").attr("src");
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
