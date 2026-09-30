"""Capture the English UI against the isolated synthetic demo library.

Start the local server with YJ_MEDIA_ROOT=dist/promo-demo-media and an isolated
YJ_STATE_ROOT, then run this script. No personal media is read or captured.
"""

import argparse
import re
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_MEDIA = ROOT / "dist" / "promo-demo-media"
DEFAULT_OUTPUT = ROOT / "dist" / "promo-capture-en"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8765")
    parser.add_argument("--media-root", type=Path, default=DEFAULT_MEDIA)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    media_root = args.media_root.resolve()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=["--use-gl=angle", "--use-angle=swiftshader"])
        page = browser.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        errors: list[str] = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        response = page.request.post(
            f"{args.url}/api/settings",
            data={"language": "en", "library_path": str(media_root), "api_key": ""},
        )
        assert response.ok, f"Could not set isolated English demo settings: {response.status} {response.text()}"
        page.goto(args.url, wait_until="networkidle")
        page.locator("html[lang='en']").wait_for()
        page.locator("#desktop-icons .desktop-icon").first.wait_for()
        page.locator("#world[data-scene='ready']").wait_for(timeout=30000)
        page.wait_for_timeout(750)

        def capture(filename: str) -> None:
            page.screenshot(path=str(output / filename), animations="disabled")
            visible = page.locator("body").inner_text()
            cjk = re.findall(r"[\u3400-\u9fff]+", visible)
            print(f"{filename}: lang={page.locator('html').get_attribute('lang')}, visible_cjk={cjk[:12]}")

        assert page.locator(".archive-intro").count() == 0, "Removed home title plaque is still present"
        assert page.locator("#menu-home").count() == 0, "Removed home logo is still present"
        assert page.locator("#desktop").get_attribute("aria-label") == "YJ media desktop"
        capture("01-desk.png")

        page.locator("#menu-settings").click()
        page.locator("#settings:not(.hidden)").wait_for()
        assert page.locator("#settings [data-i18n='settingsTitle']").inner_text() == "Desktop Settings"
        assert page.locator("#settings-language").input_value() == "en"
        page.locator("#settings-close").click()

        page.locator("#desktop-gallery").click()
        page.locator("#file-area .file-card").first.wait_for()
        page.wait_for_function("() => [...document.querySelectorAll('#file-area .file-card img')].every(image => image.complete && image.naturalWidth > 0)")
        capture("02-gallery.png")

        page.locator("#search").fill("Aurora")
        page.locator("#file-area .file-card").first.wait_for()
        capture("03-search.png")

        page.locator("#search").fill("")
        page.locator("#file-area .file-card").first.click()
        page.locator("#preview:not(.hidden) .preview-content img").wait_for()
        capture("04-preview.png")

        page.locator("#preview-close").click()
        page.locator("#desktop-music").click()
        page.locator("#file-area .file-card").first.wait_for()
        page.locator("#file-area .file-card").first.click()
        page.locator("#preview:not(.hidden) .player-device").wait_for()
        capture("05-audio.png")

        browser.close()
        assert not errors, f"Browser errors: {errors}"


if __name__ == "__main__":
    main()
