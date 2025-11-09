import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function createApplicationPdf(data, holderSigUrl, officeSigUrl) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();
  const draw = (text, x, y, size = 10) =>
    page.drawText(text || '', { x, y: height - y, size, font, color: rgb(0, 0, 0) });

  draw('APPLICATION FORM', 230, 60, 12);
  draw(`POLICY NO: ${data.policyNo}`, 40, 90, 10);
  draw(`PLAN: ${data.plan}`, 300, 90, 10);
  draw(`MONTHLY PREMIUM: R ${data.premium}`, 450, 90, 10);

  // Policy Holder & details
  draw('1. DETAILS OF POLICY HOLDER', 40, 120, 10);
  draw(`Title: ${data.title}`, 40, 140);
  draw(`Status: ${data.status}`, 150, 140);
  draw(`Sex: ${data.sex}`, 280, 140);
  draw(`Surname: ${data.surname}`, 40, 160);
  draw(`First Name: ${data.firstName}`, 280, 160);
  draw(`Cell No: ${data.cellNo}`, 40, 180);
  draw(`ID Number: ${data.idNumber}`, 280, 180);
  draw(`Address: ${data.residentialAddress}`, 40, 200);

  // Dependents
  draw('2. DEPENDENTS', 40, 230, 10);
  (data.dependents || []).forEach((d, i) => {
    const y = 250 + i * 20;
    draw(`${i + 1}. ${d.id} ${d.surname} ${d.name} ${d.relationship}`, 60, y);
  });

  // Beneficiary
  draw('3. NOMINATED BENEFICIARY', 40, 370, 10);
  draw(`Name: ${data.beneficiaryName}`, 60, 390);
  draw(`ID: ${data.beneficiaryId}`, 300, 390);

  // Office Use
  draw('4. FOR OFFICE USE ONLY', 40, 420, 10);
  draw(`Capturer: ${data.capturer}`, 60, 440);
  draw(`Checked By: ${data.checkedBy}`, 250, 440);
  draw(`Qualifying Date: ${data.qualifyingDate}`, 420, 440);

  draw('RESPECTFUL | PROFESSIONAL | DIGNIFIED', 170, 800, 10);
  draw('Head Office Phuthaditjhaba - Tel: 058 713 0112 - Cell/WhatsApp: 071 480 5050 / 073 073 1580', 40, 815, 8);
  draw('Email: thusanangfunerals@gmail.com | www.thusanangfs.co.za | FSP 39701', 120, 830, 8);

  // Signatures
  if (holderSigUrl) {
    const holderImg = await pdfDoc.embedPng(holderSigUrl);
    page.drawImage(holderImg, { x: 40, y: height - 480, width: 120, height: 40 });
    draw('Policy Holder Signature', 40, 500);
  }
  if (officeSigUrl) {
    const officeImg = await pdfDoc.embedPng(officeSigUrl);
    page.drawImage(officeImg, { x: 240, y: height - 480, width: 120, height: 40 });
    draw('Office Signature', 240, 500);
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
