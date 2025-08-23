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

export const generatePdf = async (htmlContent: string, filename: string) => {
  let logoDataUri = '';
  try {
    logoDataUri = await imageToDataUri('/logo.png');
  } catch (error) {
    console.error("Failed to load logo for PDF, proceeding without it.", error);
  }

  const element = document.createElement('div');
  const styledHtmlContent = `
    <style>
      body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; }
      h1, h2, h3 { margin-bottom: 1rem; margin-top: 1.5rem; }
      p { margin-bottom: 1rem; }
      ul, ol { margin-bottom: 1rem; padding-left: 1.5rem; }
      hr { margin-top: 25px; margin-bottom: 25px; border: 0; border-top: 1px solid #ccc; }
      img { margin-top: 25px; max-width: 100%; height: auto; }
      a { color: #007bff; text-decoration: none; }
    </style>
    ${logoDataUri ? `<div style="text-align: center; margin-bottom: 40px;">
      <img src="${logoDataUri}" style="width: 150px; height: auto; margin: 0 auto;">
    </div>` : ''}
    ${htmlContent}
  `;
  element.innerHTML = styledHtmlContent;

  const opt = {
    margin:       1,
    filename:     `${filename}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
    pagebreak:    { mode: 'avoid-all', avoid: 'img' }
  };

  // @ts-expect-error html2pdf.js does not have official type definitions
  html2pdf().from(element).set(opt).save();
};
