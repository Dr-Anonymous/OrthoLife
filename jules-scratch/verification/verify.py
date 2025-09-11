from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8080/pharmacy")

    # Wait for the page to load
    page.wait_for_selector(".grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3")

    # Find the DOLO 650 card
    dolo_card = page.locator("text=DOLO 650").first

    # Select "By Unit"
    page.locator('label:has-text("Unit")').first.click()

    # Add 2 units to the cart
    add_to_cart_button = page.locator('button:has-text("Add to Cart")').first
    add_to_cart_button.click()

    plus_button = page.locator(".flex.items-center.gap-3 > button").nth(1)
    plus_button.click()

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()
