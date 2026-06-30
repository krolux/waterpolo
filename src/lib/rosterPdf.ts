import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getClubLogoSignedUrl, type MatchRosterPdfPayload, type TournamentRosterPdfPayload } from './rosters';

export type RosterPdfPayload = MatchRosterPdfPayload | TournamentRosterPdfPayload;

async function imageUrlToDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateRosterPdf(payload: RosterPdfPayload): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 18;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(marginX, cursorY, contentWidth, 56);

  if (payload.clubLogoUrl) {
    const signedLogoUrl = await getClubLogoSignedUrl(payload.clubLogoUrl, 60 * 5);
    const logoDataUrl = await imageUrlToDataUrl(signedLogoUrl);
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', marginX + 4, cursorY + 6, 38, 24, undefined, 'FAST');
      } catch {
        // ignore logo parsing issues and continue generating PDF
      }
    }
  }

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('LISTA ZGLOSZENIOWA', pageWidth - marginX, cursorY + 13, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(`Nazwa klubu: ${payload.clubName}`, marginX + 48, cursorY + 24);
  doc.text(`Nazwa turnieju: ${payload.tournamentName || 'Rozgrywki'}`, marginX + 48, cursorY + 30);
  doc.text(`Nazwa meczu: ${payload.matchHome} - ${payload.matchAway}`, marginX + 48, cursorY + 36);
  doc.text(`Data: ${new Date(payload.matchDate).toLocaleDateString('pl-PL')}`, marginX + 48, cursorY + 42);
  doc.text(`Godzina: ${payload.matchTime || '-'}`, marginX + 48, cursorY + 48);
  doc.text(`Miejsce: ${payload.matchLocation || '-'}`, marginX + 48, cursorY + 54);
  doc.setFont('helvetica', 'bold');
  doc.text(`Kod wydruku: ${payload.verificationCode || '-'}`, pageWidth - marginX, cursorY + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  cursorY += 64;

  autoTable(doc, {
    startY: cursorY,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      lineColor: [229, 231, 235],
      lineWidth: 0.2,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    head: [['Nr', 'Imie i nazwisko', 'Rocznik', 'Numer licencji']],
    body: payload.rosterPlayers.map((player, index) => [
      String(player.slot),
      player.fullName,
      String(player.birthYear),
      player.licenseNumber,
    ]),
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 95 },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 40 },
    },
  });

  const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || cursorY + 20;
  let signaturesY = tableEndY + 14;

  if (signaturesY > 230) {
    doc.addPage();
    signaturesY = 24;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Trener:', marginX, signaturesY);
  doc.line(marginX + 22, signaturesY + 0.5, pageWidth - marginX, signaturesY + 0.5);

  signaturesY += 12;
  doc.text('Osoba towarzyszaca 1:', marginX, signaturesY);
  doc.line(marginX + 44, signaturesY + 0.5, pageWidth - marginX, signaturesY + 0.5);

  signaturesY += 12;
  doc.text('Osoba towarzyszaca 2:', marginX, signaturesY);
  doc.line(marginX + 44, signaturesY + 0.5, pageWidth - marginX, signaturesY + 0.5);

  signaturesY += 12;
  doc.text('Osoba towarzyszaca 3:', marginX, signaturesY);
  doc.line(marginX + 44, signaturesY + 0.5, pageWidth - marginX, signaturesY + 0.5);

  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  const generatedAt = new Date().toLocaleString('pl-PL');
  doc.text(`Data wygenerowania: ${generatedAt}`, marginX, 281);
  doc.text('Kod wydruku pozwala porownac dokument papierowy z aktualnym zgloszeniem w systemie WPolo.', marginX, 285);
  doc.text('Wygenerowano automatycznie przez system WPolo.', marginX, 289);

  const fileName = `lista-zgloszeniowa-${payload.clubName.replace(/\s+/g, '-').toLowerCase()}-${payload.matchDate}.pdf`;
  doc.save(fileName);
}

export async function generateMatchRosterPdf(payload: MatchRosterPdfPayload): Promise<void> {
  await generateRosterPdf(payload);
}

export async function generateTournamentRosterPdf(payload: TournamentRosterPdfPayload): Promise<void> {
  await generateRosterPdf(payload);
}
