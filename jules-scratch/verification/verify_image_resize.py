from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173/create-post")

    # Wait for the editor to be visible
    editor = page.locator(".prose").first
    expect(editor).to_be_visible()

    # Get the image upload button and set the file
    image_button = page.locator('button[title="Image"]')
    expect(image_button).to_be_visible()

    # We can't click the button because it opens a file dialog.
    # Instead, we set the input file directly on the hidden file input.
    file_input = page.locator('input[type="file"]')
    expect(file_input).to_be_hidden()

    # Note: In a real scenario, you'd have a local image file.
    # For this example, we'll assume a file exists at this path.
    # We will create a dummy file for this purpose.
    with open("jules-scratch/verification/placeholder.png", "w") as f:
        f.write("placeholder")

    file_input.set_input_files("jules-scratch/verification/placeholder.png")

    # Wait for the image to appear in the editor
    uploaded_image = editor.locator("img")
    expect(uploaded_image).to_be_visible()

    # Click the image to show the bubble menu
    uploaded_image.click()

    # Verify the bubble menu with alignment buttons is visible
    bubble_menu = page.locator('.tiptap-bubble-menu')
    expect(bubble_menu).to_be_visible()

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
