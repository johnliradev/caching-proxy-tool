const map = new Map();

export const cache = {
  save: async (endpoint, cacheData) => {
    console.log(" ");
    console.log("Saving Data on Cache");
    map.set(endpoint, {
      data: cacheData.data,
      contentType: cacheData.contentType,
      statusCode: cacheData.statusCode || 200,
      timestamp: Date.now(),
      ttl: 60000,
    });
    console.log("Data saved on Cache");
    console.log(" ");
  },
  get: async (key) => {
    console.log(" ");
    console.log("Getting data from Cache...");
    const res = map.get(key);
    if (!res) {
      console.log("Not found data");
      console.log(" ");
      return null;
    }
    const now = Date.now();
    if (now - res.timestamp > res.ttl) {
      console.log("TTL Expired");
      console.log(" ");
      map.delete(key);
      return null;
    }
    return {
      data: res.data,
      contentType: res.contentType,
      statusCode: res.statusCode,
      timestamp: res.timestamp,
      ttl: res.ttl,
    };
  },
};

export default cache;
