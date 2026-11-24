// Decap reads every GitHub response as JSON. A large media upload can make
// GitHub accept the commit and then return an empty or cut-off body for the
// following request, which Decap reports as "Unexpected end of JSON input".
(function (root) {
  if (!root.fetch || root.__githubFetchGuard) return;
  const original = root.fetch.bind(root);
  const retryDelay = () => (typeof root.__githubFetchRetryDelay === "number" ? root.__githubFetchRetryDelay : 700);

  function requestUrl(input) {
    if (typeof input === "string") return input;
    if (typeof URL !== "undefined" && input instanceof URL) return input.href;
    if (input && typeof input.url === "string") return input.url;
    return "";
  }

  function methodOf(input, init) {
    const method = (init && init.method) || (input && input.method) || "GET";
    return String(method).toUpperCase();
  }

  function header(init, name) {
    const headers = init && init.headers;
    if (!headers) return "";
    if (typeof headers.get === "function") return headers.get(name) || "";
    const key = Object.keys(headers).find((item) => item.toLowerCase() === name.toLowerCase());
    return key ? headers[key] : "";
  }

  function jsonResponse(status, value) {
    return new root.Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  async function inspect(response) {
    const type = response.headers.get("content-type") || "";
    if (!/json/i.test(type)) return "pass";
    let text = "";
    try {
      text = await response.clone().text();
    } catch {
      return "pass";
    }
    if (!text.trim()) return response.status === 204 || response.status === 205 ? "empty-success" : "unreadable";
    try {
      JSON.parse(text);
      return "pass";
    } catch (error) {
      return /end of json input/i.test(String(error && error.message)) ? "unreadable" : "pass";
    }
  }

  function shouldRetry(status) {
    return status === 0 || status === 429 || status >= 500 || (status >= 200 && status < 300);
  }

  async function recoverPull(url, init) {
    let head = "";
    try {
      head = JSON.parse(init && init.body || "{}").head || "";
    } catch {
      return null;
    }
    if (!head) return null;
    const lookup = `${url}?head=${encodeURIComponent(head)}&state=open`;
    const headers = {};
    const authorization = header(init, "Authorization");
    if (authorization) headers.Authorization = authorization;
    const found = await original(lookup, { headers });
    if ((await inspect(found)) !== "pass") return null;
    const pulls = await found.json();
    if (!Array.isArray(pulls) || !pulls.length) return null;
    return jsonResponse(201, pulls[0]);
  }

  root.fetch = async function (input, init) {
    const url = requestUrl(input);
    const response = await original(input, init);
    if (!url.startsWith("https://api.github.com/")) return response;

    const state = await inspect(response);
    if (state === "pass") return response;
    if (state === "empty-success") return jsonResponse(200, null);
    if (!shouldRetry(response.status)) {
      return jsonResponse(response.status || 502, {
        message: `GitHub returned HTTP ${response.status} with an unreadable body.`,
      });
    }

    const method = methodOf(input, init);
    if (method === "POST" && /\/pulls$/.test(url)) {
      const recovered = await recoverPull(url, init);
      if (recovered) return recovered;
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelay()));
    const retry = await original(input, init);
    const retryState = await inspect(retry);
    if (retryState === "pass") return retry;
    if (retryState === "empty-success") return jsonResponse(200, null);
    return jsonResponse(retry.ok ? 502 : (retry.status || 502), {
      message: "GitHub returned an unreadable response. Save the entry again.",
    });
  };

  root.__githubFetchGuard = true;
})(globalThis);
