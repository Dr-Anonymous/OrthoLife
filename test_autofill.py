
import asyncio
from playwright.async_api import async_playwright, TimeoutError

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            # SETUP: Create a keyword with advice
            print("Setting up test data: creating a keyword for 'fever'...")
            await page.goto('http://127.0.0.1:8080/emr')

            # Wait for the medicine name input to be available
            await page.wait_for_selector('input[placeholder="Enter medicine name"]')
            med_name_inputs = page.get_by_label("Medicine Name")
            await med_name_inputs.first.fill('@')

            # Modal should be open now.
            await page.wait_for_selector('h3:has-text("Add New Keyword")')

            # Fill in the form in the modal
            await page.fill('input#new-keywords', 'fever')
            await page.locator('div.max-h-40 input[type="checkbox"]').first.check()
            await page.fill('textarea#advice', 'Drink plenty of fluids')
            await page.click('button:has-text("Add Keyword")')

            await page.wait_for_selector('text="Keyword added successfully"')

            await page.get_by_role('button', name='Close').click()
            print("Test data setup complete.")

            # Test EMR page
            print("Testing EMR page...")
            await page.goto('http://127.0.0.1:8080/emr') # reload to be safe
            await page.fill('#complaints', 'fever')
            await page.wait_for_timeout(1000)  # Wait for debounce
            advice = await page.input_value('#advice')
            print(f"EMR advice: '{advice}'")
            if 'Drink plenty of fluids' in advice:
                print('EMR autofill test passed')
            else:
                print('EMR autofill test failed')

            # Test Consultation page
            print("Testing Consultation page...")
            await page.goto('http://127.0.0.1:8080/consultation')

            calendar_button = page.locator("button:has(svg.lucide-calendar)")
            await calendar_button.click()

            await page.locator("div[role=gridcell]:not([aria-selected=true])").first.click()

            await page.wait_for_timeout(1000)

            patient_button = page.locator('div.space-y-2.mt-2 > button').first
            try:
                await patient_button.wait_for(timeout=5000)
                await patient_button.click()
                await page.wait_for_selector('h3:has-text("Medical Information for")')
                await page.fill('#complaints', 'fever')
                await page.wait_for_timeout(1000)
                advice = await page.input_value('#advice')
                print(f"Consultation advice: '{advice}'")
                if 'Drink plenty of fluids' in advice:
                    print('Consultation autofill test passed')
                else:
                    print('Consultation autofill test failed')
            except TimeoutError:
                print("No patients found for consultation test, skipping.")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path='error_screenshot.png')
            print("Screenshot saved to error_screenshot.png")
        finally:
            await browser.close()

asyncio.run(main())
