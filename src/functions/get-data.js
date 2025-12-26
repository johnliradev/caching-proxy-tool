import cache from "./cache.js";

export const getData = async (origin, endpoint) => {
  let start = Date.now();
  let duration;
  // Looking data in cache
  const isCached = await cache.get(endpoint);
  if (isCached) {
    duration = Date.now() - start;
    console.info("Retrivied Data from Cache");
    return {
      data: isCached.data,
      contentType: isCached.contentType,
      ms: duration,
      statusCode: isCached.statusCode,
      ttl: isCached.ttl,
      cached: true,
    };
  }

  // Fetch Request
  try {
    console.info(`Getting data from ${origin}${endpoint}`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

    const res = await fetch(origin + endpoint, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        data: null,
        contentType: null,
        statusCode: res.status,
        cached: false,
        ms: Date.now() - start,
      };
    }

    duration = Date.now() - start;
    const data = await res.text();
    const contentType = res.headers.get("content-type");
    await cache.save(endpoint, { data, contentType, statusCode: res.status });

    return {
      data,
      contentType,
      statusCode: res.status,
      ms: duration,
      cached: false,
    };
  } catch (error) {
    duration = Date.now() - start;
    console.error(`Fetch error for ${endpoint}: ${error.message}`);

    if (error.name === "AbortError") {
      return {
        data: null,
        contentType: null,
        statusCode: 504,
        cached: false,
        ms: duration,
      };
    }

    return {
      data: null,
      contentType: null,
      statusCode: 500,
      cached: false,
      ms: duration,
    };
  }
};
