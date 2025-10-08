from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto("http://localhost:8080/symptom-checker")

        # Wait for the page to load
        expect(page.get_by_role("heading", name="AI Symptom Checker")).to_be_visible()

        # Input patient information
        page.locator('input[id="age"]').fill("35")
        page.locator('button[id="gender"]').click()
        page.get_by_role("option", name="Male", exact=True).click()
        page.locator('input[id="duration"]').fill("2 days")

        # Add symptoms
        symptom_input = page.locator('input[id="symptom"]')
        add_button = page.locator('input[id="symptom"] + button')

        symptom_input.fill("Headache")
        add_button.click()
        symptom_input.fill("Fever")
        add_button.click()

        # Analyze symptoms
        page.get_by_role("button", name="Analyze Symptoms").click()

        # Wait for the analysis to appear
        expect(page.get_by_role("heading", name="Preliminary Analysis", exact=True)).to_be_visible(timeout=30000)

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

        print("Screenshot saved to jules-scratch/verification/verification.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)