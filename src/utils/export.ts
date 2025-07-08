import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';
import { Survey, Response } from '../types/survey';

export const exportUtils = {
  exportToCSV: (survey: Survey, responses: Response[]) => {
    const headers = ['Response ID', 'Submitted At', ...survey.questions.map(q => q.title)];
    
    const data = responses.map(response => {
      const row = [response.id, new Date(response.submittedAt).toLocaleString()];
      
      survey.questions.forEach(question => {
        const answer = response.answers.find(a => a.questionId === question.id);
        row.push(answer ? String(answer.value) : '');
      });
      
      return row;
    });

    const csv = Papa.unparse([headers, ...data]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${survey.title}-responses.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  exportToExcel: (survey: Survey, responses: Response[]) => {
    const headers = ['Response ID', 'Submitted At', ...survey.questions.map(q => q.title)];
    
    const data = responses.map(response => {
      const row: any = {
        'Response ID': response.id,
        'Submitted At': new Date(response.submittedAt).toLocaleString()
      };
      
      survey.questions.forEach(question => {
        const answer = response.answers.find(a => a.questionId === question.id);
        row[question.title] = answer ? String(answer.value) : '';
      });
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    // Set column widths
    const colWidths = headers.map(header => ({ wch: Math.max(header.length, 15) }));
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Responses');
    XLSX.writeFile(workbook, `${survey.title}-responses.xlsx`);
  },

  exportToPDF: async (survey: Survey, responses: Response[]) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(survey.title, margin, yPosition);
    yPosition += 10;

    // Survey info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Survey Report - Generated on ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 8;
    pdf.text(`Total Responses: ${responses.length}`, margin, yPosition);
    yPosition += 15;

    // Summary section
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', margin, yPosition);
    yPosition += 10;

    // Question summaries
    for (const question of survey.questions) {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const questionText = pdf.splitTextToSize(question.title, pageWidth - 2 * margin);
      pdf.text(questionText, margin, yPosition);
      yPosition += questionText.length * 6 + 5;

      const answers = responses.map(r => r.answers.find(a => a.questionId === question.id)?.value).filter(Boolean);

      if (question.type === 'multiple-choice') {
        const distribution: { [key: string]: number } = {};
        answers.forEach(answer => {
          distribution[answer as string] = (distribution[answer as string] || 0) + 1;
        });

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        Object.entries(distribution).forEach(([choice, count]) => {
          const percentage = Math.round((count / responses.length) * 100);
          pdf.text(`• ${choice}: ${count} (${percentage}%)`, margin + 5, yPosition);
          yPosition += 5;
        });
      } else if (question.type === 'rating') {
        const ratings = answers.map(a => Number(a)).filter(n => !isNaN(n));
        const average = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Average Rating: ${average.toFixed(1)}/${question.maxRating || 5}`, margin + 5, yPosition);
        yPosition += 5;
        pdf.text(`Total Ratings: ${ratings.length}`, margin + 5, yPosition);
        yPosition += 5;
      } else {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${answers.length} text responses`, margin + 5, yPosition);
        yPosition += 5;
      }

      yPosition += 10;
    }

    // Detailed responses section
    if (responses.length > 0) {
      pdf.addPage();
      yPosition = margin;
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detailed Responses', margin, yPosition);
      yPosition += 15;

      responses.slice(0, 10).forEach((response, index) => {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Response ${index + 1}`, margin, yPosition);
        yPosition += 6;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Submitted: ${new Date(response.submittedAt).toLocaleString()}`, margin, yPosition);
        yPosition += 8;

        response.answers.forEach(answer => {
          const question = survey.questions.find(q => q.id === answer.questionId);
          if (question) {
            const questionText = pdf.splitTextToSize(`Q: ${question.title}`, pageWidth - 2 * margin - 10);
            pdf.text(questionText, margin + 5, yPosition);
            yPosition += questionText.length * 4 + 2;
            
            const answerText = pdf.splitTextToSize(`A: ${answer.value}`, pageWidth - 2 * margin - 10);
            pdf.text(answerText, margin + 5, yPosition);
            yPosition += answerText.length * 4 + 5;
          }
        });

        yPosition += 5;
      });

      if (responses.length > 10) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`... and ${responses.length - 10} more responses`, margin, yPosition);
      }
    }

    pdf.save(`${survey.title}-report.pdf`);
  }
};