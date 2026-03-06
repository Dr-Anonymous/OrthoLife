export interface TocItem {
    id: string;
    text: string;
    level: number;
}

export function generateTocAndInjectIds(htmlString: string): { processedHtml: string; tocItems: TocItem[] } {
    if (!htmlString) {
        return { processedHtml: '', tocItems: [] };
    }

    // Use DOMParser to safely parse and manipulate HTML in the browser
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const tocItems: TocItem[] = [];
    const headingElements = doc.querySelectorAll('h2, h3');

    headingElements.forEach((heading) => {
        const text = heading.textContent || heading.innerText || '';
        if (!text.trim()) return;

        // Generate a URL-safe ID
        // 1. Lowercase
        // 2. Keep English alphanumeric and Telugu Unicode (0C00-0C7F)
        // 3. Replace spaces and other characters with hyphens
        // 4. Trim hyphens
        let id = text
            .toLowerCase()
            .replace(/[^a-z0-9\u0C00-\u0C7F]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Fallback if ID is empty
        if (!id) {
            id = `section-${Math.random().toString(36).substr(2, 9)}`;
        }

        // Ensure ID is unique within this document
        let uniqueId = id;
        let counter = 1;
        while (tocItems.some(item => item.id === uniqueId)) {
            uniqueId = `${id}-${counter}`;
            counter++;
        }

        // Inject the ID back into the DOM element
        heading.id = uniqueId;

        // Add to our TOC list
        tocItems.push({
            id: uniqueId,
            text: text.trim(),
            level: parseInt(heading.tagName.replace('H', ''), 10),
        });
    });

    return {
        processedHtml: doc.body.innerHTML,
        tocItems,
    };
}
