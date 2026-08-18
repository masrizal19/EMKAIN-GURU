/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { GeneratedSet } from '../types';

/**
 * Exports a generated question set to a beautifully formatted PDF.
 * Uses Times New Roman (times core font) at 12 pt.
 * Features an intelligent page break checker to keep questions intact.
 */
export function exportToPDF(generatedSet: GeneratedSet): boolean {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const margin = 50;
    const printableWidth = 595 - (margin * 2);
    const pageHeight = 842;
    const bottomMargin = 792; // 842 - 50
    let currentY = 50;
    const lineSpacing = 18;

    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > bottomMargin) {
        doc.addPage();
        currentY = 50;
      }
    };

    // 1. Draw Title Group (Times New Roman Bold 12pt)
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    
    doc.text('TOPIK PEMBELAJARAN', margin, currentY);
    currentY += lineSpacing;

    const topicLines = doc.splitTextToSize(generatedSet.topic || 'Umum', printableWidth);
    topicLines.forEach((line: string) => {
      doc.text(line, margin, currentY);
      currentY += lineSpacing;
    });
    currentY += 10; // Extra spacing

    // 2. Draw Metadata Group (Times New Roman 12pt)
    const metadata = [
      { label: 'KELAS:', value: generatedSet.grade },
      { label: 'JUMLAH SOAL:', value: `${generatedSet.quantity} Soal` },
      { label: 'TIPE SOAL:', value: generatedSet.questionType === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Esai' },
      { label: 'TINGKAT KESULITAN:', value: generatedSet.difficulty.toUpperCase() }
    ];

    metadata.forEach((item) => {
      checkPageBreak(lineSpacing);
      
      // Draw bold label
      doc.setFont('times', 'bold');
      doc.text(item.label, margin, currentY);
      
      // Draw normal value next to it
      const labelWidth = doc.getTextWidth(item.label) + 10;
      doc.setFont('times', 'normal');
      doc.text(item.value, margin + labelWidth, currentY);
      currentY += lineSpacing;
    });

    currentY += 20; // Spacing before questions

    // 3. Draw Questions Group
    generatedSet.questions.forEach((q, index) => {
      // Estimate block height to prevent split questions
      const qNumText = `Q${index + 1}. `;
      const fullQText = qNumText + q.questionText;
      const qLines = doc.splitTextToSize(fullQText, printableWidth);
      
      let blockHeight = qLines.length * lineSpacing + 10;

      // Options height estimation
      const isMultipleChoice = q.options && q.options.length > 0;
      let optionLineData: Array<{ letter: string; lines: string[] }> = [];
      if (isMultipleChoice) {
        q.options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          const fullOptText = `${letter}. ${opt}`;
          const optLines = doc.splitTextToSize(fullOptText, printableWidth);
          optionLineData.push({ letter, lines: optLines });
          blockHeight += optLines.length * lineSpacing + 6;
        });
      } else {
        blockHeight += lineSpacing + 10;
      }

      // Explanation height estimation
      let expLines: string[] = [];
      if (q.explanation) {
        expLines = doc.splitTextToSize(q.explanation, printableWidth);
        blockHeight += 15 + expLines.length * lineSpacing + 15;
      }

      // Prevent broken question layout across pages
      checkPageBreak(blockHeight);

      // Draw Question (Bold)
      doc.setFont('times', 'bold');
      qLines.forEach((line: string) => {
        doc.text(line, margin, currentY);
        currentY += lineSpacing;
      });
      currentY += 5;

      // Draw Options (Normal)
      if (isMultipleChoice) {
        doc.setFont('times', 'normal');
        optionLineData.forEach((optItem) => {
          optItem.lines.forEach((line: string) => {
            doc.text(line, margin + 15, currentY); // Indented
            currentY += lineSpacing;
          });
          currentY += 4;
        });
      } else {
        doc.setFont('times', 'italic');
        doc.text('[ Lembar Jawaban Siswa ]', margin + 15, currentY);
        currentY += lineSpacing + 5;
      }

      // Draw Explanation (Header bold, body normal)
      if (q.explanation) {
        currentY += 5;
        doc.setFont('times', 'bold');
        doc.text('PENJELASAN JAWABAN:', margin, currentY);
        currentY += lineSpacing;

        doc.setFont('times', 'normal');
        expLines.forEach((line: string) => {
          doc.text(line, margin, currentY);
          currentY += lineSpacing;
        });
      }

      currentY += 25; // Spacer
    });

    // Sanitized File Name
    const sanitizedTopic = (generatedSet.topic || 'Soal')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
    const fileName = `Soal_${sanitizedTopic}_Kelas_${generatedSet.grade}.pdf`;

    // Download
    doc.save(fileName);
    return true;
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new Error('Gagal membuat file PDF. Silakan coba lagi.');
  }
}

/**
 * Exports a generated question set to a valid, authentic Microsoft Word (.docx) document.
 * Adheres strictly to Times New Roman 12 pt formatting constraints.
 */
export async function exportToWord(generatedSet: GeneratedSet): Promise<boolean> {
  try {
    const children: Paragraph[] = [];

    // Spacing converter
    const createParagraph = (textRuns: TextRun[], spacingAfter = 120) => {
      return new Paragraph({
        spacing: { after: spacingAfter },
        children: textRuns
      });
    };

    // Text properties converter (Size in docx is measured in half-points; 12pt = 24)
    const createTimesRun = (text: string, bold = false, sizePt = 12) => {
      return new TextRun({
        text,
        font: 'Times New Roman',
        size: sizePt * 2,
        bold
      });
    };

    // 1. Draw Title Group
    children.push(createParagraph([
      createTimesRun('TOPIK PEMBELAJARAN', true, 12)
    ], 60));

    children.push(createParagraph([
      createTimesRun(generatedSet.topic || 'Umum', true, 12)
    ], 240));

    // 2. Draw Metadata Group
    const metadata = [
      { label: 'KELAS: ', value: generatedSet.grade },
      { label: 'JUMLAH SOAL: ', value: `${generatedSet.quantity} Soal` },
      { label: 'TIPE SOAL: ', value: generatedSet.questionType === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Esai' },
      { label: 'TINGKAT KESULITAN: ', value: generatedSet.difficulty.toUpperCase() }
    ];

    metadata.forEach((item) => {
      children.push(createParagraph([
        createTimesRun(item.label, true, 12),
        createTimesRun(item.value, false, 12)
      ], 80));
    });

    children.push(createParagraph([createTimesRun('')], 240)); // Gap before questions

    // 3. Draw Questions Group
    generatedSet.questions.forEach((q, index) => {
      // Question Paragraph (Bold)
      children.push(createParagraph([
        createTimesRun(`Q${index + 1}. `, true, 12),
        createTimesRun(q.questionText, true, 12)
      ], 120));

      // Options Paragraphs (Normal, Indented)
      const isMultipleChoice = q.options && q.options.length > 0;
      if (isMultipleChoice) {
        q.options.forEach((opt, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          children.push(new Paragraph({
            spacing: { after: 80 },
            indent: { left: 720 }, // 0.5 inch indent (720 dxa)
            children: [
              createTimesRun(`${letter}. `, false, 12),
              createTimesRun(opt, false, 12)
            ]
          }));
        });
      } else {
        children.push(new Paragraph({
          spacing: { after: 120 },
          indent: { left: 720 },
          children: [
            createTimesRun('[ Lembar Jawaban Siswa ]', false, 12)
          ]
        }));
      }

      // Explanation Paragraphs
      if (q.explanation) {
        children.push(createParagraph([
          createTimesRun('PENJELASAN JAWABAN:', true, 12)
        ], 60));

        children.push(createParagraph([
          createTimesRun(q.explanation, false, 12)
        ], 180));
      } else {
        children.push(createParagraph([createTimesRun('')], 180));
      }
    });

    // Create standard docx document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: children
        }
      ]
    });

    // Packer to Blob
    const blob = await Packer.toBlob(doc);

    // Sanitized File Name
    const sanitizedTopic = (generatedSet.topic || 'Soal')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
    const fileName = `Soal_${sanitizedTopic}_Kelas_${generatedSet.grade}.docx`;

    // Standard download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return true;
  } catch (error) {
    console.error('Word export failed:', error);
    throw new Error('Gagal membuat file Word. Silakan coba lagi.');
  }
}
