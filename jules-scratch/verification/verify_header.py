from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://127.0.0.1:8081/")

    # Wait for the loader to disappear
    expect(page.locator("svg.lucide-loader-circle")).to_be_hidden(timeout=10000)

    # Check for login button
    expect(page.get_by_role("button", name="Login")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/header.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)