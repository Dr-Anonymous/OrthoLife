import html2pdf from 'html2pdf.js';

export const generatePdf = (htmlContent: string, filename: string) => {
  const element = document.createElement('div');
  element.innerHTML = htmlContent;

  const opt = {
    margin:       1,
    filename:     `${filename}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  // @ts-expect-error html2pdf.js does not have official type definitions
  html2pdf().from(element).set(opt).save();
};
