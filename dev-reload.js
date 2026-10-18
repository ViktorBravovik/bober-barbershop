/* Dev only: reloads the page when index.html, style.css or main.js change on disk.
   Does nothing outside localhost, so it is safe to ship. */
(() => {
  if (!["localhost", "127.0.0.1"].includes(location.hostname)) return;
  const files = ["index.html", "style.css", "main.js"];
  let last = null;
  const stamp = async () =>
    (await Promise.all(files.map((f) =>
      fetch(f, { method: "HEAD", cache: "no-store" }).then((r) => r.headers.get("last-modified"))
    ))).join("|");
  setInterval(async () => {
    try {
      const now = await stamp();
      if (last && now !== last) location.reload();
      last = now;
    } catch {}
  }, 1000);
})();
