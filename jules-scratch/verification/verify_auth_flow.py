from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to auth page
    page.goto("http://127.0.0.1:8081/auth")

    # Wait for the loader to disappear
    expect(page.locator("svg.lucide-loader-circle")).to_be_hidden(timeout=10000)

    # Check for login button
    expect(page.get_by_role("button", name="Login")).to_be_visible()

    # Enter phone number
    page.get_by_label("Phone Number").fill("1234567890")

    # Click send OTP
    page.get_by_role("button", name="Send OTP").click()

    # Wait for the OTP screen to appear
    expect(page.get_by_test_id("otp-form")).to_be_visible()

    # Enter OTP
    page.get_by_label("Enter OTP").fill("123456")

    # Click verify OTP
    page.get_by_role("button", name="Verify OTP").click()

    # Wait for navigation to the home page
    page.wait_for_url("http://127.0.0.1:8081/")

    # Check for logout button
    expect(page.get_by_role("button", name="Logout")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/logout_visible.png")

    # Click logout
    page.get_by_role("button", name="Logout").click()

    # Wait for a moment to ensure logout is complete
    time.sleep(2)

    # Check for login button again
    expect(page.get_by_role("button", name="Login")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/login_visible.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)