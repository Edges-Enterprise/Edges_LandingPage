#!/usr/bin/env python3
"""Static file server for /public that also accepts uploaded file revisions.

Serves the same directory `python3 -m http.server` did (so the campaign
previews keep working), and adds a write side:

  POST /upload                      multipart/form-data, one or more files
  POST /upload   X-Filename: <name> raw body is the file
  PUT  /upload/<name>               raw body is the file
  GET  /upload                      JSON list of what has been received

Only known campaign filenames land in their real source path; any other
safelisted extension lands in .uploads/ for review. Everything is also kept
in .uploads/ as an audit copy. Dev-only, no auth: bind to the sandbox port
and treat anything received as untrusted until reviewed.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import re
import time
import zipfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

ROOT = "/workspace/project2"
SERVE_DIR = os.path.join(ROOT, "public")
INBOX = os.path.join(ROOT, ".uploads")
PORT = int(os.environ.get("UPLOAD_PORT", "12000"))
MAX_BYTES = 5 * 1024 * 1024

# filename -> real destination, relative to the repo root
DEST = {
    "CampaignCard.tsx": "src/components/campaign/CampaignCard.tsx",
    "FirstDepositCampaignCard.tsx": "src/components/campaign/FirstDepositCampaignCard.tsx",
    "campaign-card.css": "src/components/campaign/campaign-card.css",
    "firstDepositCampaign.ts": "src/actions/reseller/campaigns/firstDepositCampaign.ts",
}
SAFE_EXT = {".ts", ".tsx", ".css", ".json", ".md", ".txt", ".patch", ".diff", ".zip"}
NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def safe_name(raw: str) -> str | None:
    name = os.path.basename(unquote(raw or "")).strip()
    if not name or not NAME_RE.match(name) or ".." in name:
        return None
    return name


def target_for(name: str) -> str | None:
    """Where an upload should land, or None if the name is not accepted."""
    if name in DEST:
        return os.path.join(ROOT, DEST[name])
    ext = os.path.splitext(name)[1].lower()
    return os.path.join(INBOX, name) if ext in SAFE_EXT else None


def _extract_zip(name: str, data: bytes) -> dict:
    """Extract a zip into .uploads/<name>.extracted/, then route each member.

    Only allowlisted members are routed: a known campaign filename goes to its
    real source path, any other allowlisted extension goes to the extracted
    folder. Path separators are flattened, so a zip cannot escape the tree.
    """
    stamp = time.strftime("%Y%m%d-%H%M%S")
    outdir = os.path.join(INBOX, f"{name}.{stamp}.extracted")
    os.makedirs(outdir, exist_ok=True)
    members: list[dict] = []
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            base = os.path.basename(info.filename)
            if not base or base.startswith(".") or not NAME_RE.match(base):
                continue
            ext = os.path.splitext(base)[1].lower()
            if ext not in SAFE_EXT or ext == ".zip":
                continue
            payload = zf.read(info)
            if base in DEST:
                dest = os.path.join(ROOT, DEST[base])
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, "wb") as fh:
                    fh.write(payload)
                saved = os.path.relpath(dest, ROOT)
            else:
                dest = os.path.join(outdir, base)
                with open(dest, "wb") as fh:
                    fh.write(payload)
                saved = os.path.relpath(dest, ROOT)
            members.append(
                {
                    "name": base,
                    "saved": saved,
                    "bytes": len(payload),
                    "sha256": hashlib.sha256(payload).hexdigest()[:16],
                }
            )
    return {"name": name, "extracted_to": os.path.relpath(outdir, ROOT), "members": members}


def save(name: str, data: bytes) -> dict:
    dest = target_for(name)
    if dest is None:
        return {"name": name, "error": "rejected: name not allowlisted"}
    os.makedirs(INBOX, exist_ok=True)
    # Keep the original archive/payload verbatim in the inbox first.
    with open(os.path.join(INBOX, name), "wb") as fh:
        fh.write(data)
    if name.lower().endswith(".zip"):
        return _extract_zip(name, data)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as fh:
        fh.write(data)
    return {
        "name": name,
        "saved": os.path.relpath(dest, ROOT),
        "bytes": len(data),
        "sha256": hashlib.sha256(data).hexdigest()[:16],
    }


def parse_multipart(body: bytes, boundary: bytes) -> list[tuple[str, bytes]]:
    out: list[tuple[str, bytes]] = []
    for chunk in body.split(b"--" + boundary)[1:]:
        if chunk[:2] == b"--":
            break
        chunk = chunk[2:] if chunk.startswith(b"\r\n") else chunk
        chunk = chunk[:-2] if chunk.endswith(b"\r\n") else chunk
        head, _, data = chunk.partition(b"\r\n\r\n")
        m = re.search(rb'filename="([^"]*)"', head)
        if m:
            out.append((m.group(1).decode("utf-8", "replace"), data))
    return out


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=SERVE_DIR, **kw)

    def _json(self, code: int, payload) -> None:
        body = json.dumps(payload, indent=2).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlparse(self.path).path == "/upload":
            rows = []
            if os.path.isdir(INBOX):
                for n in sorted(os.listdir(INBOX)):
                    p = os.path.join(INBOX, n)
                    if os.path.isfile(p):
                        rows.append(
                            {
                                "name": n,
                                "bytes": os.path.getsize(p),
                                "received": time.strftime(
                                    "%Y-%m-%d %H:%M:%S",
                                    time.localtime(os.path.getmtime(p)),
                                ),
                            }
                        )
            return self._json(200, {"inbox": INBOX, "received": rows})
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/upload":
            return self._json(404, {"error": "POST only to /upload"})
        return self._receive()

    def do_PUT(self):
        path = urlparse(self.path).path
        if not path.startswith("/upload/"):
            return self._json(404, {"error": "PUT only to /upload/<name>"})
        name = safe_name(path[len("/upload/"):])
        if not name:
            return self._json(400, {"error": "bad filename"})
        body = self._read_body()
        if body is None:
            return
        return self._json(200, {"ok": True, "results": [save(name, body)]})

    def _read_body(self) -> bytes | None:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            self._json(400, {"error": "empty body"})
            return None
        if length > MAX_BYTES:
            self._json(413, {"error": f"too large (max {MAX_BYTES} bytes)"})
            return None
        return self.rfile.read(length)

    def _receive(self):
        body = self._read_body()
        if body is None:
            return
        header_name = self.headers.get("X-Filename")
        if header_name:
            name = safe_name(header_name)
            if not name:
                return self._json(400, {"error": "bad X-Filename"})
            return self._json(200, {"ok": True, "results": [save(name, body)]})

        ctype = self.headers.get("Content-Type", "")
        m = re.search(r'boundary="?([^";]+)"?', ctype)
        if "multipart/form-data" not in ctype or not m:
            return self._json(
                400,
                {
                    "error": "send multipart/form-data, or set X-Filename for a raw body",
                    "allowed": sorted(DEST),
                },
            )
        results = [save(safe_name(n) or n, d) for n, d in parse_multipart(body, m.group(1).encode())]
        return self._json(200, {"ok": True, "results": results})

    def log_message(self, fmt, *args):
        with open("/tmp/upload_server.log", "a") as fh:
            fh.write("%s - %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    os.makedirs(INBOX, exist_ok=True)
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"serving {SERVE_DIR} + uploads on :{PORT}", flush=True)
    srv.serve_forever()
