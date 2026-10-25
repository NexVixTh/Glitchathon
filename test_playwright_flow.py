import asyncio
import os
from playwright.async_api import async_playwright

async def test_flow():
    print("Testing Playwright flow against running http://localhost:3000...")
    os.makedirs("demo_output", exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()
        
        print("1. Going to http://localhost:3000...")
        await page.goto("http://localhost:3000", wait_until="domcontentloaded")
        await page.evaluate("localStorage.clear()")
        await page.reload(wait_until="domcontentloaded")
        await page.wait_for_selector("text=SyncUp AI", timeout=10000)
        await page.screenshot(path="demo_output/step1_initial.png")
        print("  -> Step 1 screenshot saved")
        
        # Click Judge live demo
        print("2. Finding and clicking demo button...")
        demo_btn = page.locator("button:has-text('Judge live demo'), button[title*='VIT-AP']").first
        await demo_btn.click()
        await page.wait_for_selector("text=Study roadmap", timeout=10000)
        await page.screenshot(path="demo_output/step2_after_demo.png")
        print("  -> Step 2 screenshot saved")
        
        # Check off a task
        print("3. Clicking a task checkbox...")
        checkbox = page.locator("button[aria-label*='Mark']").first
        await checkbox.click()
        await asyncio.sleep(1)
        await page.screenshot(path="demo_output/step3_task_checked.png")
        print("  -> Step 3 screenshot saved")
        
        # Click Focus button
        print("4. Clicking Focus button...")
        focus_btn = page.locator("button[aria-label*='Start focus sprint']").first
        await focus_btn.click()
        await page.wait_for_selector("text=Focus dock", timeout=5000)
        await page.screenshot(path="demo_output/step4_pomodoro_open.png")
        print("  -> Step 4 screenshot saved")
        
        # Click Recall button
        print("5. Clicking Recall button...")
        recall_btn = page.locator("button[aria-label*='Open active recall']").first
        await recall_btn.click()
        await page.wait_for_selector(".flip-card", timeout=8000)
        await page.screenshot(path="demo_output/step5_recall_drawer.png")
        print("  -> Step 5 screenshot saved")
        
        # Flip card
        print("6. Flipping card...")
        flip = page.locator(".flip-card").first
        await flip.click()
        await asyncio.sleep(1)
        await page.screenshot(path="demo_output/step6_card_flipped.png")
        print("  -> Step 6 screenshot saved")
        
        # Switch to Quiz tab and click an answer
        print("7. Testing quiz tab...")
        quiz_tab = page.locator("button[role='tab']:has-text('Mastery quiz')")
        if await quiz_tab.count() > 0:
            await quiz_tab.click()
            await asyncio.sleep(1)
            # Click first answer option
            opt = page.locator("button:has-text('Read-your-writes')").first
            if await opt.count() > 0:
                await opt.click()
                await asyncio.sleep(1)
            await page.screenshot(path="demo_output/step6b_quiz_answered.png")
            print("  -> Step 6b screenshot saved")

        # Close drawer
        close_btn = page.locator("button[aria-label='Close']").first
        await close_btn.click()
        await asyncio.sleep(1)
        
        # Rebalance
        print("8. Clicking I Fell Behind...")
        rebalance = page.locator("button:has-text('I Fell Behind')").first
        await rebalance.click()
        await asyncio.sleep(2)
        await page.screenshot(path="demo_output/step7_rebalanced.png")
        print("  -> Step 7 screenshot saved")
        
        # Architecture modal
        print("9. Clicking Architecture...")
        arch = page.locator("button:has-text('Architecture')").first
        await arch.click()
        await page.wait_for_selector("text=System architecture", timeout=5000)
        await page.screenshot(path="demo_output/step8_architecture.png")
        print("  -> Step 8 screenshot saved")
        
        await browser.close()
        print("SUCCESS: ALL STEPS CLICKED AND RECORDED PERFECTLY!")

if __name__ == "__main__":
    asyncio.run(test_flow())
