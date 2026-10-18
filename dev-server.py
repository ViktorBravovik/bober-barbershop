"""Local dev server: like `python3 -m http.server`, but tells the browser never to cache,
so every reload shows the latest index.html / style.css / main.js / images."""
import http.server
import sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
http.server.ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
