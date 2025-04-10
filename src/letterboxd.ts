import { load } from "cheerio";
import { consts } from "./consts.js";
import { cache } from "./cache.js";

async function getHtml(
  url: string
): Promise<ReturnType<typeof load> | undefined> {
  console.info(`url: ${url}`);

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
    console.error(error);
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
  console.info(`slug: ${slug}`);

  console.info(`Checking cache for ${slug}`);
  const cachedRating = await cache.get(slug);
  if (cachedRating) {
    console.info(`Cached rating for ${slug}: ${cachedRating}`);
    return {
      slug,
      rating: cachedRating.rating,
      poster: cachedRating.posterUrl,
      stars: `${cachedRating.rating} / 5`,
    };
  }

  try {
    const $rating = await getHtml(
      `https://letterboxd.com/csi/film/${slug}/rating-histogram/`
    );
    if (!$rating) return undefined;
    const rating = $rating("span.average-rating").text().trim();

    const $poster = await getHtml(
      `https://letterboxd.com/ajax/poster/film/${slug}/hero/230x345/?k=_45aa59a6`
    );
    if (!$poster) return undefined;
    let poster = $poster("img").attr("src");
    if (!poster) {
      console.error("No poster found");
      poster = consts.errorImageUrl;
    }

    const stars = `${+rating}/5`;

    // set cache
    cache.set({ slug, rating: +rating, poster });

    return { rating: +rating, slug, poster, stars };
  } catch (error) {
    console.error(error);
  }

  return undefined;
};
