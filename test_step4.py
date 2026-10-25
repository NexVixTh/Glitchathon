import asyncio
from playwright.async_api import async_playwright

async def diag():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
        await page.goto('http://localhost:3000', wait_until='domcontentloaded')
        demo_btn = page.locator("button:has-text('Judge live demo'), button[title*='VIT-AP']").first
        await demo_btn.click()
        await page.wait_for_selector("text=Study roadmap", timeout=10000)
        
        # Test focus in header
        hdr_focus = page.locator("button[aria-label='Open focus timer']").first
        print("Header focus visible:", await hdr_focus.is_visible())
        await hdr_focus.click()
        await asyncio.sleep(1)
        dock_count = await page.locator("text=Focus dock").count()
        print("Dock visible after header focus click:", dock_count)
        
        # Test row focus
        row_focus = page.locator("button[aria-label*='Start focus sprint']").first
        print("Row focus count:", await page.locator("button[aria-label*='Start focus sprint']").count())
        if await row_focus.count() > 0:
            print("Row focus visible:", await row_focus.is_visible())
            await row_focus.scroll_into_view_if_needed()
            await row_focus.click()
            await asyncio.sleep(1)
            print("Dock visible after row focus click:", await page.locator("text=Focus dock").count())
            
        await browser.close()

if __name__ == '__main__':
    asyncio.run(diag())
