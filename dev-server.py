#!/usr/bin/env python3
"""Local dev server for this static site.

Plain `python3 -m http.server` sends no Cache-Control header, so browsers
apply heuristic caching and can keep serving a stale assets/js/main.js (or
any other asset) across normal reloads while you're editing — this bit us
once already. This wrapper just disables caching for every response.
"""
import http.server
import socketserver

PORT = 8765


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
        print(f"Serving on http://localhost:{PORT} (no-cache)")
        httpd.serve_forever()
