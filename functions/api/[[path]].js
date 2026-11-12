export async function onRequest(context) {
  const backend = (context.env.BACKEND_URL || "").trim().replace(/\/+$/, "");
  if (!backend) {
    return new Response(
      JSON.stringify({
        error:
          "BACKEND_URL is not configured in Cloudflare Pages environment variables.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  const url = new URL(context.request.url);
  const targetUrl = backend + url.pathname + url.search;
  const headers = new Headers(context.request.headers);
  headers.delete("host");
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
  const init = {
    method: context.request.method,
    headers,
    redirect: "manual",
  };
  if (!["GET", "HEAD"].includes(context.request.method)) {
    init.body = context.request.body;
    init.duplex = "half";
  }
  try {
    return await fetch(targetUrl, init);
  } catch {
    return new Response(
      JSON.stringify({ error: "Could not reach the backend server." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

