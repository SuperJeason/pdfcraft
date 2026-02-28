function normalizePathParam(pathParam) {
  if (!pathParam) return "";
  if (Array.isArray(pathParam)) return pathParam.join("/");
  return String(pathParam);
}

function inferContentType(key) {
  if (key.endsWith(".wasm")) return "application/wasm";
  if (key.endsWith(".data")) return "application/octet-stream";
  if (key.endsWith(".js") || key.endsWith(".mjs")) return "application/javascript";
  if (key.endsWith(".gz")) return "application/octet-stream";
  return "application/octet-stream";
}

function buildHeaders(key, object) {
  const headers = new Headers();
  headers.set("Content-Type", inferContentType(key));
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  if (object.httpEtag) headers.set("ETag", object.httpEtag);
  if (typeof object.size === "number") headers.set("Content-Length", String(object.size));
  if (key.endsWith(".gz")) headers.set("Content-Encoding", "gzip");

  return headers;
}

export async function onRequest(context) {
  const { request, env, params } = context;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!env.LIBREOFFICE_ASSETS) {
    return new Response("R2 binding LIBREOFFICE_ASSETS is not configured.", { status: 500 });
  }

  const subPath = normalizePathParam(params.path);
  if (!subPath) {
    return new Response("Not Found", { status: 404 });
  }

  const key = `libreoffice-wasm/${subPath}`;
  const object = await env.LIBREOFFICE_ASSETS.get(key);
  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = buildHeaders(key, object);
  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(object.body, { status: 200, headers });
}
