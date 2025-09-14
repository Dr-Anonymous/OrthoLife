import json
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Mock the API response
    def handle_route(route):
        if "search-test-results" in route.request.url:
            mock_data = {
                "John Doe": [
                    {
                        "testId": "TR001",
                        "patientName": "John Doe",
                        "testDate": "2024-01-15",
                        "testType": "Complete Blood Count",
                        "status": "completed",
                        "reportDate": "2024-01-16",
                        "testResult": "All within normal range."
                    },
                    {
                        "testId": "TR002",
                        "patientName": "John Doe",
                        "testDate": "2024-01-10",
                        "testType": "Lipid Profile",
                        "status": "processing",
                        "reportDate": None,
                        "testResult": "Pending"
                    }
                ]
            }
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(mock_data)
            )
        else:
            route.continue_()

    page.route("**/*", handle_route)

    # Navigate to the page
    page.goto("http://127.0.0.1:8080/track-test-results")

    # Enter a phone number and search
    page.get_by_label("Phone Number or Booking ID").fill("1234567890")
    page.get_by_role("button", name="Search").click()

    # Wait for the results to appear
    expect(page.get_by_text("John Doe")).to_be_visible()

    # Click the first test and verify the modal
    page.get_by_text("Complete Blood Count").click()
    dialog1 = page.locator('[role="dialog"]')
    expect(dialog1).to_be_visible()
    expect(dialog1.locator('text=Complete Blood Count')).to_be_visible()
    expect(dialog1.locator('text=All within normal range.')).to_be_visible()
    dialog1.locator('[aria-label="Close"]').click()
    expect(dialog1).not_to_be_visible()

    # Click the second test and verify the modal
    page.get_by_text("Lipid Profile").click()
    dialog2 = page.locator('[role="dialog"]')
    expect(dialog2).to_be_visible()
    expect(dialog2.locator('text=Lipid Profile')).to_be_visible()
    expect(dialog2.locator('text=Pending')).to_be_visible()

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
