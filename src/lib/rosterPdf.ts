import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getClubLogoSignedUrl, type MatchRosterPdfPayload, type TournamentRosterPdfPayload } from './rosters';

export type RosterPdfPayload = MatchRosterPdfPayload | TournamentRosterPdfPayload;

type RosterPdfDocumentType = 'match' | 'tournament';

type BadgeSpec = {
  label: string;
  width: number;
};

const PDF_FONT_FAMILY = 'NotoSans';
let fontsRegistered = false;

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return binary;
}

async function registerUnicodeFonts(doc: jsPDF): Promise<void> {
  if (fontsRegistered) {
    return;
  }

  const [regularResponse, boldResponse] = await Promise.all([
    fetch('/fonts/NotoSans-Regular.ttf'),
    fetch('/fonts/NotoSans-Bold.ttf'),
  ]);

  if (!regularResponse.ok || !boldResponse.ok) {
    throw new Error('Nie udało się załadować fontów PDF.');
  }

  const [regularBuffer, boldBuffer] = await Promise.all([
    regularResponse.arrayBuffer(),
    boldResponse.arrayBuffer(),
  ]);

  doc.addFileToVFS('NotoSans-Regular.ttf', arrayBufferToBinaryString(regularBuffer));
  doc.addFont('NotoSans-Regular.ttf', PDF_FONT_FAMILY, 'normal');

  doc.addFileToVFS('NotoSans-Bold.ttf', arrayBufferToBinaryString(boldBuffer));
  doc.addFont('NotoSans-Bold.ttf', PDF_FONT_FAMILY, 'bold');

  fontsRegistered = true;
}

function fitTextToLines(doc: jsPDF, text: string, maxWidth: number, maxLines = 2): string[] {
  const wrapped = doc.splitTextToSize(text, maxWidth) as string[];
  if (wrapped.length <= maxLines) {
    return wrapped;
  }

  const clipped = wrapped.slice(0, maxLines);
  const lastLine = clipped[maxLines - 1];
  let shortened = lastLine;

  while (shortened.length > 0 && doc.getTextWidth(`${shortened}...`) > maxWidth) {
    shortened = shortened.slice(0, -1);
  }

  if (!shortened.trim()) {
    const source = lastLine.trim() || text.trim();
    shortened = source.slice(0, Math.min(6, source.length)).trim();
  }

  clipped[maxLines - 1] = `${shortened}...`;
  return clipped;
}

function drawBadge(doc: jsPDF, x: number, y: number, spec: BadgeSpec) {
  const badgeHeight = 4.6;
  doc.setDrawColor(148, 163, 184);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, spec.width, badgeHeight, 2.2, 2.2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(51, 65, 85);
  doc.text(spec.label, x + spec.width / 2, y + 3.25, { align: 'center' });
}

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

export async function generateRosterPdf(payload: RosterPdfPayload, documentType: RosterPdfDocumentType): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  await registerUnicodeFonts(doc);
  doc.setFont(PDF_FONT_FAMILY, 'normal');

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const headerTop = 12;
  const headerHeight = 24;
  const infoTop = headerTop + headerHeight + 3;
  const infoHeight = 34;
  const footerTop = 271;
  let cursorY = infoTop + infoHeight + 4;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(marginX, headerTop, contentWidth, headerHeight);
  doc.rect(marginX, infoTop, contentWidth, infoHeight);

  if (payload.clubLogoUrl) {
    const signedLogoUrl = await getClubLogoSignedUrl(payload.clubLogoUrl, 60 * 5);
    const logoDataUrl = await imageUrlToDataUrl(signedLogoUrl);
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', marginX + 3, headerTop + 5, 24, 16, undefined, 'FAST');
      } catch {
        // ignore logo parsing issues and continue generating PDF
      }
    }
  }

  doc.setTextColor(31, 41, 55);
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(14.2);
  doc.text(
    documentType === 'tournament' ? 'LISTA ZGŁOSZENIOWA – TURNIEJ' : 'LISTA ZGŁOSZENIOWA – MECZ',
    pageWidth / 2,
    headerTop + 11,
    { align: 'center' }
  );

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8.4);
  const metaStartX = marginX + 4;
  const metaWidth = contentWidth - 8;
  const clubNameLines = fitTextToLines(doc, `Nazwa klubu: ${payload.clubName}`, metaWidth, 2);
  const tournamentNameLines = fitTextToLines(doc, `Nazwa turnieju: ${payload.tournamentName || 'Rozgrywki'}`, metaWidth, 2);
  const matchNameLines = fitTextToLines(doc, `Nazwa meczu: ${payload.matchHome} - ${payload.matchAway}`, metaWidth, 2);
  const matchDate = new Date(payload.matchDate);
  const timeLabel = `Godzina: ${payload.matchTime || '-'}`;
  const locationLine = fitTextToLines(doc, `Miejsce: ${payload.matchLocation || '-'}`, metaWidth, 1);

  doc.text(clubNameLines, metaStartX, infoTop + 7);
  doc.text(tournamentNameLines, metaStartX, infoTop + 14);
  doc.text(matchNameLines, metaStartX, infoTop + 21);
  doc.text(`Data: ${matchDate.toLocaleDateString('pl-PL')}`, metaStartX, infoTop + 27);
  doc.text(timeLabel, metaStartX + 50, infoTop + 27);
  doc.text(locationLine, metaStartX, infoTop + 31);

  const maxSlots = documentType === 'tournament' ? 17 : 15;
  const playersBySlot = new Map(payload.rosterPlayers.map((player) => [player.slot, player]));
  const tableRows = Array.from({ length: maxSlots }, (_, index) => {
    const slot = index + 1;
    const player = playersBySlot.get(slot);

    return [
      String(slot),
      player?.fullName || '',
      player ? String(player.birthYear) : '',
      player?.licenseNumber || '',
    ];
  });

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    theme: 'grid',
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    styles: {
      font: PDF_FONT_FAMILY,
      fontSize: 7.6,
      lineColor: [226, 232, 240],
      lineWidth: 0.18,
      cellPadding: 1,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    bodyStyles: {
      minCellHeight: 5.9,
    },
    head: [['Nr', 'Imię i nazwisko', 'Rocznik', 'Numer licencji']],
    body: tableRows,
    columnStyles: {
      0: { cellWidth: 11, halign: 'center' },
      1: { cellWidth: 88 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 65 },
    },
    didParseCell: (hookData) => {
      if (hookData.section !== 'body' || hookData.column.index !== 1) {
        return;
      }

      const rowIndex = hookData.row.index;
      const player = playersBySlot.get(rowIndex + 1);
      const badges: BadgeSpec[] = [];

      if (player?.isGoalkeeper) {
        badges.push({ label: 'GK', width: 7.2 });
      }
      if (player?.isCaptain) {
        badges.push({ label: 'C', width: 5.4 });
      }

      const reservedWidth = badges.reduce((sum, badge) => sum + badge.width, 0) + (badges.length > 0 ? (badges.length - 1) * 1.6 + 1.5 : 0);
      hookData.cell.styles.cellPadding = {
        top: 1,
        right: 1,
        bottom: 1,
        left: badges.length > 0 ? reservedWidth + 1.2 : 1.4,
      };

      const formattedName = player?.fullName || '';
      const availableWidth = Math.max(16, hookData.cell.width - (hookData.cell.styles.cellPadding as { left: number }).left - 1.5);
      hookData.cell.text = fitTextToLines(doc, formattedName, availableWidth, 2);
    },
    didDrawCell: (hookData) => {
      if (hookData.section !== 'body' || hookData.column.index !== 1) {
        return;
      }

      const player = playersBySlot.get(hookData.row.index + 1);
      if (!player) {
        return;
      }

      const badges: BadgeSpec[] = [];
      if (player.isGoalkeeper) {
        badges.push({ label: 'GK', width: 7.2 });
      }
      if (player.isCaptain) {
        badges.push({ label: 'C', width: 5.4 });
      }

      if (badges.length === 0) {
        return;
      }

      let badgeX = hookData.cell.x + 1.3;
      const badgeY = hookData.cell.y + (hookData.cell.height - 4.6) / 2;
      for (const badge of badges) {
        drawBadge(doc, badgeX, badgeY, badge);
        badgeX += badge.width + 1.2;
      }
    },
  });

  let signaturesY = Math.max((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || cursorY + 2, 190) + 6;
  if (signaturesY > 216) {
    signaturesY = 216;
  }

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8.6);
  doc.text('Trener główny:', marginX, signaturesY);
  doc.line(marginX + 25, signaturesY + 0.5, pageWidth - marginX, signaturesY + 0.5);

  signaturesY += 7.8;
  doc.text('Oficjel 1:', marginX, signaturesY);
  doc.line(marginX + 18, signaturesY + 0.5, pageWidth - marginX, signaturesY + 0.5);

  signaturesY += 7.8;
  doc.text('Oficjel 2:', marginX, signaturesY);
  doc.line(marginX + 18, signaturesY + 0.5, pageWidth - marginX, signaturesY + 0.5);

  signaturesY += 7.8;
  doc.text('Podpis osoby uprawnionej / pieczęć klubu:', marginX, signaturesY);
  doc.line(marginX, signaturesY + 4.4, pageWidth - marginX, signaturesY + 4.4);

  doc.setFontSize(7.6);
  doc.setTextColor(107, 114, 128);
  const generatedAt = new Date();
  const generatedAtLabel = `${generatedAt.toLocaleDateString('pl-PL')}, ${generatedAt.toLocaleTimeString('pl-PL', { hour12: false })}`;
  doc.text('Wygenerowano automatycznie przez system WPolo.', marginX, footerTop);
  doc.text(`Data wygenerowania: ${generatedAtLabel}`, marginX, footerTop + 4.5);
  doc.text('Kod wydruku pozwala porównać dokument papierowy z aktualnym zgłoszeniem w systemie WPolo.', marginX, footerTop + 9);
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Kod wydruku: ${payload.verificationCode || '-'}`, pageWidth - marginX, footerTop + 4.5, { align: 'right' });

  const fileName = `lista-zgloszeniowa-${payload.clubName.replace(/\s+/g, '-').toLowerCase()}-${payload.matchDate}.pdf`;
  doc.save(fileName);
}

export async function generateMatchRosterPdf(payload: MatchRosterPdfPayload): Promise<void> {
  await generateRosterPdf(payload, 'match');
}

export async function generateTournamentRosterPdf(payload: TournamentRosterPdfPayload): Promise<void> {
  await generateRosterPdf(payload, 'tournament');
}
