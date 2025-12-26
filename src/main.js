import { createServer } from "node:http";
import { URL } from "node:url";
import { getData } from "./functions/get-data.js";

const hostname = "localhost";
const port = process.env.PORT;
const origin = process.env.ORIGIN;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const method = req.method;
  // Ignore favicon requests
  if (url.pathname === "/favicon.ico") {
    res.statusCode = 204; // No Content
    res.end();
    return;
  }
  // Only accetps GET method
  if (method === "GET") {
    // Use pathname + search (query strings) as cache key
    const cacheKey = url.pathname + url.search;
    const { data, statusCode, contentType, cached, ms } = await getData(
      origin,
      cacheKey
    );

    console.log(
      `Request took ${ms}ms / STATUS ${statusCode} / X-Cache: ${
        cached ? "HIT" : "MISS"
      }`
    );

    res.statusCode = statusCode || 200;
    res.setHeader("X-Cache-Status", cached ? "HIT" : "MISS");
    res.setHeader("Content-Type", contentType || "application/json");

    if (!data) {
      res.statusCode = statusCode || 500;
      res.end("Error fetching data");
      return;
    }

    res.end(data);
    return;
  } else {
    res.statusCode = 405; // Method not allowed
    res.end("Method Not Allowed");
    return;
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
