#!/usr/bin/env python3
"""Run the unpacked Chromium extension against the bundled mock profile."""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.request

try:
    from playwright.sync_api import sync_playwright
except ImportError as error:
    raise SystemExit(
        "Playwright is required for this optional E2E test. "
        "Run: python3 -m pip install -r requirements-e2e.txt"
    ) from error


ROOT = Path(__file__).resolve().parents[2]
EXTENSION = ROOT / "dist" / "dev"
MOCK_URL = "http://127.0.0.1:4173/"


def wait_for_mock(server: subprocess.Popen[str]) -> None:
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if server.poll() is not None:
            output = server.stdout.read() if server.stdout else ""
            raise RuntimeError(f"Mock server exited early: {output.strip()}")
        try:
            with urllib.request.urlopen(MOCK_URL, timeout=0.5) as response:
                if response.status == 200:
                    return
        except OSError:
            time.sleep(0.1)
    raise RuntimeError("Mock server did not become ready on 127.0.0.1:4173")


def run() -> dict[str, object]:
    if not (EXTENSION / "manifest.json").is_file():
        raise RuntimeError("dist/dev is missing; run npm run build:dev")

    server = subprocess.Popen(
        [process_exec(), "scripts/mock-server.mjs"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        wait_for_mock(server)
        print("E2E: mock ready", file=sys.stderr, flush=True)
        with tempfile.TemporaryDirectory(prefix="linked-draw-chromium-") as profile:
            with sync_playwright() as playwright:
                executable = os.environ.get("LINKED_DRAW_CHROME") or playwright.chromium.executable_path
                if not Path(executable).is_file():
                    raise RuntimeError("Playwright Chromium is missing; run: python3 -m playwright install chromium")
                context = playwright.chromium.launch_persistent_context(
                    profile,
                    executable_path=executable,
                    headless=os.environ.get("LINKED_DRAW_HEADLESS") == "1",
                    viewport={"width": 1280, "height": 800},
                    args=[
                        f"--disable-extensions-except={EXTENSION}",
                        f"--load-extension={EXTENSION}",
                        "--no-first-run",
                        "--no-default-browser-check",
                    ],
                )
                try:
                    print("E2E: Chromium launched", file=sys.stderr, flush=True)
                    page = context.pages[0] if context.pages else context.new_page()
                    console_errors: list[str] = []
                    failed_responses: list[str] = []
                    page.on(
                        "console",
                        lambda message: console_errors.append(message.text)
                        if message.type == "error"
                        else None,
                    )
                    page.on(
                        "response",
                        lambda response: failed_responses.append(
                            f"{response.status} {response.url}"
                        )
                        if response.status >= 400
                        else None,
                    )
                    page.goto(MOCK_URL, wait_until="networkidle")
                    print("E2E: extension page loaded", file=sys.stderr, flush=True)
                    page.wait_for_timeout(1500)
                    print(
                        "E2E: diagnostics "
                        + json.dumps(
                            {
                                "hostCount": page.locator("#linked-draw-extension-host").count(),
                                "serviceWorkers": [worker.url for worker in context.service_workers],
                                "consoleErrors": console_errors,
                            }
                        ),
                        file=sys.stderr,
                        flush=True,
                    )

                    host = page.locator("#linked-draw-extension-host")
                    host.wait_for(state="attached")
                    draw_button = host.locator(".ld-floating-button")
                    draw_button.wait_for(state="visible")
                    draw_button.click()

                    modal = host.locator(".ld-modal")
                    modal.wait_for(state="visible")
                    print("E2E: editor opened", file=sys.stderr, flush=True)
                    assert host.locator('[data-tool="pen"]').evaluate("element => element.getRootNode().activeElement === element")
                    page.keyboard.press("Shift+Tab")
                    assert host.locator('[data-action="save"]').evaluate("element => element.getRootNode().activeElement === element")
                    page.keyboard.press("Tab")
                    assert host.locator('[data-tool="pen"]').evaluate("element => element.getRootNode().activeElement === element")
                    canvas = modal.locator(".ld-canvas")
                    assert canvas.get_attribute("width") == "1584"
                    assert canvas.get_attribute("height") == "396"
                    box = canvas.bounding_box()
                    if not box:
                        raise AssertionError("Canvas has no visible geometry")

                    page.mouse.move(box["x"] + box["width"] * 0.25, box["y"] + box["height"] * 0.45)
                    page.mouse.down()
                    page.mouse.move(box["x"] + box["width"] * 0.55, box["y"] + box["height"] * 0.58, steps=8)
                    page.mouse.up()

                    clear_button = modal.locator('[data-action="clear"]')
                    clear_button.click()
                    modal.locator('[data-action="undo"]').click()

                    screenshot_directory = os.environ.get("LINKED_DRAW_SCREENSHOT_DIR")
                    screenshot = None
                    if screenshot_directory:
                        destination = Path(screenshot_directory)
                        destination.mkdir(parents=True, exist_ok=True)
                        screenshot = destination / "linked-draw-editor.png"
                        page.screenshot(path=str(screenshot), full_page=False)

                    original_cover = page.locator("#cover-image").get_attribute("src")
                    page.keyboard.press("Escape")
                    modal.wait_for(state="detached")
                    assert page.locator("#cover-image").get_attribute("src") == original_cover
                    assert draw_button.evaluate("element => element.getRootNode().activeElement === element")
                    print("E2E: cancel preserved cover", file=sys.stderr, flush=True)

                    draw_button.wait_for(state="visible")
                    draw_button.click()
                    modal.wait_for(state="visible")
                    second_canvas = modal.locator(".ld-canvas")
                    second_box = second_canvas.bounding_box()
                    if not second_box:
                        raise AssertionError("Reopened canvas has no visible geometry")
                    page.mouse.move(second_box["x"] + 80, second_box["y"] + 70)
                    page.mouse.down()
                    page.mouse.move(second_box["x"] + 180, second_box["y"] + 95, steps=5)
                    page.mouse.up()
                    modal.locator('[data-action="save"]').click()
                    print("E2E: save requested", file=sys.stderr, flush=True)

                    dialog = page.locator("#cover-dialog")
                    dialog.wait_for(state="visible")
                    file_input = page.locator("#cover-file")
                    page.wait_for_function(
                        "document.querySelector('#cover-file').files.length === 1"
                    )
                    print("E2E: native file handoff observed", file=sys.stderr, flush=True)
                    file_name = file_input.evaluate("input => input.files[0].name")
                    file_size = file_input.evaluate("input => input.files[0].size")
                    assert file_name.startswith("linkedin-cover-")
                    assert 0 < file_size < 8 * 1024 * 1024
                    page.wait_for_function(
                        "original => document.querySelector('#cover-image').src !== original",
                        arg=original_cover,
                    )
                    dialog.wait_for(state="hidden")
                    assert page.locator("#cover-image").get_attribute("src") != original_cover
                    print("E2E: native Save auto-confirmed", file=sys.stderr, flush=True)

                    extension_id = context.service_workers[0].url.split("/")[2]
                    options_page = context.new_page()
                    options_page.on(
                        "console",
                        lambda message: console_errors.append(message.text)
                        if message.type == "error"
                        else None,
                    )
                    options_page.goto(f"chrome-extension://{extension_id}/options/options.html")
                    print("E2E: options opened", file=sys.stderr, flush=True)
                    width = options_page.locator('[name="defaultWidth"]')
                    width.wait_for(state="visible")
                    width.evaluate(
                        "element => { element.value = '13'; element.dispatchEvent(new Event('input', { bubbles: true })); }"
                    )
                    options_page.wait_for_function(
                        "document.querySelector('#save-status').textContent.trim().length > 0"
                    )
                    print("E2E: options save observed", file=sys.stderr, flush=True)
                    options_page.reload()
                    assert options_page.locator('[name="defaultWidth"]').input_value() == "13"
                    options_page.locator("#reset").click()
                    assert options_page.locator('[name="defaultWidth"]').input_value() == "8"
                    options_page.close()
                    print("E2E: options persistence verified", file=sys.stderr, flush=True)

                    if console_errors:
                        raise AssertionError(f"Console errors: {console_errors}")
                    if failed_responses:
                        raise AssertionError(f"Failed responses: {failed_responses}")

                    result = {
                        "browser": Path(executable).name,
                        "canvas": "1584x396",
                        "file": {"name": file_name, "bytes": file_size},
                        "screenshot": str(screenshot) if screenshot else None,
                        "consoleErrors": 0,
                        "failedResponses": 0,
                        "settingsPersistence": True,
                        "keyboardFocus": True,
                    }
                    print(json.dumps(result, indent=2), flush=True)
                    return result
                finally:
                    context.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=3)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=3)


def process_exec() -> str:
    return os.environ.get("LINKED_DRAW_NODE", "node")


if __name__ == "__main__":
    try:
        run()
    except Exception as error:  # Playwright reports actionable context here.
        print(f"Chromium E2E failed: {error}", file=sys.stderr)
        raise
