import PDFDocument from 'pdfkit';
import fs from 'fs';

try {
  const doc = new PDFDocument({ autoFirstPage: false });
  doc.pipe(fs.createWriteStream('test.pdf'));
  
  const img = doc.openImage('test.png');
  doc.addPage({ size: [img.width, img.height] });
  doc.image(img, 0, 0);
  doc.end();
  console.log("PDF generated successfully using pdfkit!");
} catch (err) {
  console.error("PDF generation failed:", err);
}
