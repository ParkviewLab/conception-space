# SPDX-License-Identifier: AGPL-3.0-or-later
# SPDX-FileCopyrightText: 2026 Gary Frattarola <garyf@parkviewlab.ai>
"""SpaceMouse → WebSocket bridge.

Reads 6DOF input from a 3Dconnexion SpaceMouse via HID and streams it to
any connected browser as JSON: {"t": [tx, ty, tz], "r": [rx, ry, rz]}.

Run alongside the HTML viewer:
    cs-spacemouse          # default port 8765
    cs-spacemouse --port 9000
"""

from __future__ import annotations

import argparse
import asyncio
import json
import struct
import sys
import threading
import time
from typing import Any

import hid  # type: ignore[import-untyped]
import websockets.asyncio.server as ws_server
from websockets.asyncio.server import ServerConnection

# ── Device discovery ───────────────────────────────────────────────────────────

# 3Dconnexion USB vendor IDs (legacy Logitech OEM + current)
_VENDOR_IDS: frozenset[int] = frozenset({0x256F, 0x046D})

# Known product names for display; any VID-matched device is attempted.
_PRODUCT_NAMES: dict[int, str] = {
    0xC635: "SpaceMouse Compact",
    0xC62B: "SpaceMouse Pro",
    0xC631: "SpaceMouse Pro Wireless",
    0xC652: "Universal Receiver",
    0xC64B: "SpaceMouse Wireless",
    0xC621: "SpaceMouse",
    0xC603: "SpaceMouse (classic)",
}

# ── HID reader ─────────────────────────────────────────────────────────────────

# Raw axis values saturate around ±350 on most SpaceMouse models.
_AXIS_SCALE = 1.0 / 350.0
_DEADZONE = 10  # raw counts below which the axis reads as zero

# SpaceMouse HID report layout (all current models):
#   Report 0x01 — translation : 6 bytes → 3 × int16 LE  (tx, ty, tz)
#   Report 0x02 — rotation    : 6 bytes → 3 × int16 LE  (rx, ry, rz)
#   Report 0x03 — buttons     : bit-field (not used here)
_STRUCT_3H = struct.Struct("<3h")


def _scale(raw: int) -> float:
    return 0.0 if abs(raw) < _DEADZONE else raw * _AXIS_SCALE


class SpaceMouseReader:
    def __init__(self) -> None:
        self._dev: Any = None  # hid.device (no stubs available)
        self._t: list[float] = [0.0, 0.0, 0.0]
        self._r: list[float] = [0.0, 0.0, 0.0]

    def open(self) -> str:
        """Find and open the first available SpaceMouse. Returns a display name."""
        for info in hid.enumerate():
            if info["vendor_id"] not in _VENDOR_IDS:
                continue
            dev: Any = hid.device()  # type: ignore
            try:
                dev.open_path(info["path"])
            except OSError:
                continue
            dev.set_nonblocking(True)
            self._dev = dev
            pid = info["product_id"]
            name = info.get("product_string") or _PRODUCT_NAMES.get(pid, f"SpaceMouse {pid:#06x}")
            return name
        raise RuntimeError(
            "No SpaceMouse found — check USB connection and that no other "
            "application has exclusive HID access."
        )

    def read(self) -> dict[str, list[float]] | None:
        """Non-blocking poll. Returns updated state dict or None if no new data."""
        if self._dev is None:
            return None
        data = self._dev.read(64, timeout_ms=8)  # blocks up to 8 ms
        if not data or len(data) < 7:
            return None

        report_id = data[0]
        vals = _STRUCT_3H.unpack_from(bytes(data[1:7]))

        match report_id:
            case 1:
                self._t = [_scale(v) for v in vals]
            case 2:
                self._r = [_scale(v) for v in vals]
            case _:
                return None

        return {"t": list(self._t), "r": list(self._r)}

    def close(self) -> None:
        if self._dev:
            self._dev.close()
            self._dev = None


# ── WebSocket server ───────────────────────────────────────────────────────────

_clients: set[ServerConnection] = set()


async def _handler(websocket: ServerConnection) -> None:
    _clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        _clients.discard(websocket)


async def _broadcast(msg: str) -> None:
    if not _clients:
        return
    await asyncio.gather(*(_c.send(msg) for _c in _clients), return_exceptions=True)


def _hid_thread(
    reader: SpaceMouseReader,
    loop: asyncio.AbstractEventLoop,
    queue: asyncio.Queue[str],
) -> None:
    while True:
        state = reader.read()
        if state:
            asyncio.run_coroutine_threadsafe(queue.put(json.dumps(state)), loop)


async def _bridge(port: int) -> None:
    reader = SpaceMouseReader()

    # Retry device open until it appears (device might be plugged in later)
    while True:
        try:
            name = reader.open()
            break
        except RuntimeError as exc:
            print(f"[spacemouse] {exc}", file=sys.stderr)
            print("[spacemouse] retrying in 3 s …", file=sys.stderr)
            time.sleep(3)

    print(f"[spacemouse] device  : {name}")
    print(f"[spacemouse] serving : ws://localhost:{port}")

    loop: asyncio.AbstractEventLoop = asyncio.get_event_loop()
    queue: asyncio.Queue[str] = asyncio.Queue()

    thread = threading.Thread(target=_hid_thread, args=(reader, loop, queue), daemon=True)
    thread.start()

    async with ws_server.serve(_handler, "localhost", port):
        while True:
            msg = await queue.get()
            await _broadcast(msg)


# ── Entry point ────────────────────────────────────────────────────────────────


def main() -> None:
    ap = argparse.ArgumentParser(description="Stream SpaceMouse input over WebSocket")
    ap.add_argument("--port", type=int, default=8765, metavar="PORT")
    args = ap.parse_args()
    import contextlib

    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(_bridge(args.port))
