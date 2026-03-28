import html2pdf from 'html2pdf.js';

const imageToDataUri = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fetch(src)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
        }
        return res.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
};

const preloadImages = (htmlContent: string): Promise<void> => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const images = Array.from(doc.querySelectorAll('img'));

    if (images.length === 0) {
      return Promise.resolve();
    }

    const promises = images.map(img => {
      return new Promise<void>((resolve) => {
        const newImg = new Image();
        newImg.src = img.src;
        // Resolve regardless of success or failure to avoid blocking PDF generation
        newImg.onload = () => resolve();
        newImg.onerror = () => resolve();
      });
    });

    return Promise.all(promises).then(() => { });
  } catch (error) {
    console.error("Error preloading images:", error);
    return Promise.resolve(); // Don't block PDF generation on parsing error
  }
};

const getMaxTableColumns = (htmlContent: string): number => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const tables = Array.from(doc.querySelectorAll('table'));
    if (tables.length === 0) return 0;

    let maxCols = 0;
    tables.forEach(table => {
      const rows = Array.from(table.querySelectorAll('tr'));
      rows.forEach(row => {
        const cols = Array.from(row.querySelectorAll('th, td')).reduce((count, cell) => {
          const span = Number(cell.getAttribute('colspan') || 1);
          return count + (Number.isFinite(span) && span > 0 ? span : 1);
        }, 0);
        if (cols > maxCols) maxCols = cols;
      });
    });
    return maxCols;
  } catch (error) {
    console.error("Error parsing HTML for table columns:", error);
    return 0;
  }
};

const normalizeHtmlForPdf = (htmlContent: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    doc.querySelectorAll('table').forEach(table => {
      const directCells = Array.from(table.querySelectorAll(':scope > tbody > tr > th, :scope > tbody > tr > td'));
      const directNestedTables = Array.from(table.querySelectorAll(':scope > tbody > tr > th > table, :scope > tbody > tr > td > table'));

      if (directNestedTables.length === 1 && directCells.length > 1) {
        const nestedTable = directNestedTables[0];
        const nonNestedContent = directCells.filter(cell => !cell.contains(nestedTable)).some(cell => {
          const text = (cell.textContent || '').replace(/\u00a0/g, ' ').trim();
          return text.length > 0 || cell.querySelector('img, ul, ol, table, hr');
        });

        if (!nonNestedContent) {
          table.replaceWith(nestedTable);
        }
      }
    });

    doc.querySelectorAll('table').forEach(tableElement => {
      const table = tableElement as HTMLElement;
      table.style.removeProperty('width');
      table.style.removeProperty('min-width');
      table.style.removeProperty('max-width');

      table.querySelectorAll('colgroup').forEach(colgroup => colgroup.remove());

      table.querySelectorAll('th, td').forEach(cellElement => {
        const cell = cellElement as HTMLElement;
        cell.style.removeProperty('width');
        cell.style.removeProperty('min-width');
        cell.style.removeProperty('max-width');
      });
    });

    return doc.body.innerHTML;
  } catch (error) {
    console.error("Error normalizing HTML for PDF:", error);
    return htmlContent;
  }
};

export const generatePdf = async (htmlContent: string, filename: string) => {
  let logoDataUri = '';
  try {
    logoDataUri = await imageToDataUri('/images/logos/logo.png');
  } catch (error) {
    console.error("Failed to load logo for PDF, proceeding without it.", error);
  }

  await preloadImages(htmlContent);

  const normalizedHtmlContent = normalizeHtmlForPdf(htmlContent);
  const maxCols = getMaxTableColumns(normalizedHtmlContent);
  const isWide = maxCols >= 5;

  const element = document.createElement('div');
  element.style.width = isWide ? '1020px' : '760px';
  element.style.padding = '0';
  element.style.backgroundColor = '#ffffff';

  const styledHtmlContent = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Telugu:wght@400;600;700&display=swap');
      
      .pdf-root {
        font-family: 'Inter', 'Noto Sans Telugu', -apple-system, sans-serif; 
        line-height: 1.45;
        color: #111827;
        background: #ffffff;
        padding: 28px 30px;
      }
      .pdf-root * {
        box-sizing: border-box;
      }
      .pdf-root h1,
      .pdf-root h2,
      .pdf-root h3 {
        color: #0f172a;
        line-height: 1.25;
      }
      .pdf-root h1 {
        font-size: 24pt;
        font-weight: 700;
        margin: 0 0 1.5rem;
        text-align: center;
      }
      .pdf-root h2 {
        font-size: 17pt;
        margin: 2rem 0 0.85rem;
        font-weight: 700;
      }
      .pdf-root h3 {
        font-size: 13pt;
        margin: 1.35rem 0 0.6rem;
        font-weight: 600;
      }
      .pdf-root p,
      .pdf-root li {
        font-size: 11pt;
        color: #111827;
      }
      .pdf-root p {
        margin: 0 0 0.95rem;
      }
      .pdf-root ul,
      .pdf-root ol {
        margin: 0 0 1.15rem;
        padding-left: 1.5rem;
      }
      .pdf-root li {
        margin-bottom: 0.4rem;
      }
      .pdf-root hr {
        margin: 26px 0;
        border: 0;
        border-top: 1px solid #94a3b8;
      }
      .pdf-root img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 18px auto;
      }
      .pdf-root a {
        color: #1d4ed8;
        text-decoration: underline;
      }

      .pdf-root table {
        width: 100% !important; 
        margin: 1.4rem 0 1.8rem !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        table-layout: auto !important;
        background-color: #ffffff !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
      }
      .pdf-root thead {
        display: table-header-group;
      }
      .pdf-root tfoot {
        display: table-row-group;
      }
      .pdf-root tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .pdf-root tr:first-child > th,
      .pdf-root tr:first-child > td {
        border-top: 1.5px solid #475569 !important;
      }
      .pdf-root tr > th:first-child,
      .pdf-root tr > td:first-child {
        border-left: 1px solid #64748b !important;
      }
      .pdf-root tr > th:last-child,
      .pdf-root tr > td:last-child {
        border-right: 1px solid #64748b !important;
      }
      .pdf-root tr:last-child > th,
      .pdf-root tr:last-child > td {
        border-bottom: 1.5px solid #475569 !important;
      }
      .pdf-root th,
      .pdf-root td {
        color: #0f172a !important;
        padding: ${isWide ? '8px 7px' : '10px 8px'};
        vertical-align: top;
        text-align: left;
        white-space: normal;
        word-break: normal;
        overflow-wrap: break-word;
        border-bottom: 1px solid #cbd5e1 !important;
        border-right: 1px solid #cbd5e1 !important;
      }
      .pdf-root th {
        background-color: #e2e8f0 !important;
        font-weight: 700;
        font-size: ${isWide ? '9.5pt' : '10.5pt'};
      }
      .pdf-root td {
        background-color: #ffffff !important;
        font-size: ${isWide ? '9.75pt' : '10.75pt'};
      }
      .pdf-root tbody tr:nth-child(even) td {
        background-color: #f8fafc !important;
      }
      
      .pdf-header {
        text-align: center;
        margin-bottom: 28px;
        padding-bottom: 10px;
        border-bottom: 2px solid #0f172a;
      }
      .pdf-content > :first-child {
        margin-top: 0;
      }
      .pdf-footer {
        margin-top: 42px;
        text-align: center;
        font-size: 9pt;
        color: #475569;
        border-top: 1px solid #cbd5e1;
        padding-top: 10px;
      }
    </style>
    <div class="pdf-root">
      ${logoDataUri ? `<div class="pdf-header">
        <img src="${logoDataUri}" style="width: 170px; height: auto; margin: 0 auto 4px;">
        <div style="font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #0f172a;">Clinical Guide</div>
      </div>` : ''}
      <div class="pdf-content">
        <h1>${filename}</h1>
        ${normalizedHtmlContent}
      </div>
      <div class="pdf-footer">
        Generated on ${new Date().toLocaleDateString()} | https://Ortho.Life
      </div>
    </div>
  `;
  element.innerHTML = styledHtmlContent;

  const opt = {
    margin: 0.3,
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      windowWidth: isWide ? 1040 : 780
    },
    jsPDF: { unit: 'in', format: 'a4', orientation: isWide ? 'landscape' : 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['img', 'tr'] }
  };

  // html2pdf.js does not have official type definitions
  return (html2pdf as any)().from(element).set(opt).save();
};
