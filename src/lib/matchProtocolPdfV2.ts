import { jsPDF } from "jspdf";
import type { Match } from "../types/wpolo";
import type { MatchProtocolDraft, ProtocolEvent, ProtocolEventKind, ProtocolPlayer } from "./matchProtocol";

const PDF_FONT = "NotoSans";
const PAGE_EVENT_LIMIT = 75;
const TABLE_EVENT_LIMIT = 25;
const SYMBOLS: Partial<Record<ProtocolEventKind, string>> = { goal: "G", exclusion: "W", exclusion_substitution: "WZ", brutality: "WB", penalty: "K", timeout: "To", yellow_card: "ŻK", red_card: "CZK", official_penalty: "Kof", shootout_goal: "G", shootout_miss: "noG" };
const eventSymbol = (kind?: ProtocolEventKind) => kind ? SYMBOLS[kind] || "" : "";
const protocolScore = (events: ProtocolEvent[]) => events.reduce((score, event) => { if (event.kind === "goal" || event.kind === "shootout_goal") score[event.team] += 1; return score; }, { home: 0, away: 0 });
const playerGoals = (events: ProtocolEvent[], playerId: string) => events.filter(event => event.kind === "goal" && event.playerId === playerId).length;
const playerMajorFoulEvents = (events: ProtocolEvent[], playerId: string) => events.filter(event => ["exclusion", "penalty", "exclusion_substitution", "brutality", "double_exclusion"].includes(event.kind) && event.playerId === playerId);
const requiresDisciplinaryDecision = (kind: ProtocolEventKind) => ["yellow_card", "red_card", "exclusion_substitution", "brutality"].includes(kind);

function binary(buffer: ArrayBuffer) { const bytes = new Uint8Array(buffer); let value = ""; for (let i = 0; i < bytes.length; i += 0x8000) value += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return value; }
async function registerFonts(doc: jsPDF) {
  const [regular, bold] = await Promise.all([fetch("/fonts/NotoSans-Regular.ttf"), fetch("/fonts/NotoSans-Bold.ttf")]);
  if (!regular.ok || !bold.ok) throw new Error("Nie udało się załadować fontów protokołu PDF.");
  doc.addFileToVFS("NotoSans-Regular.ttf", binary(await regular.arrayBuffer())); doc.addFont("NotoSans-Regular.ttf", PDF_FONT, "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", binary(await bold.arrayBuffer())); doc.addFont("NotoSans-Bold.ttf", PDF_FONT, "bold");
}

const rosterRows = (players: ProtocolPlayer[], protocol: MatchProtocolDraft, mvpPlayerId: string) => Array.from({ length: 15 }, (_, index) => {
  const player = players.find(item => item.slot === index + 1);
  const fouls = player ? playerMajorFoulEvents(protocol.events, player.id) : [];
  const marks = player ? [player.isCaptain ? "C" : "", player.isGoalkeeper ? "GK" : "", player.id === mvpPlayerId ? "MVP" : ""].filter(Boolean).map(mark => `(${mark})`).join(" ") : "";
  return [String(index + 1), player ? `${player.name}${marks ? ` ${marks}` : ""}` : "", player ? String(playerGoals(protocol.events, player.id)) : "", eventSymbol(fouls[0]?.kind) || "", eventSymbol(fouls[1]?.kind) || "", eventSymbol(fouls[2]?.kind) || ""];
});

const participant = (event: ProtocolEvent, players: ProtocolPlayer[], protocol: MatchProtocolDraft) => {
  const player = players.find(item => item.id === event.playerId);
  if (player) return String(player.capNumber);
  const role = event.playerId?.split(":")[2];
  if (!role) return "-";
  const names = event.team === "home" ? { coach: protocol.homeCoach, official1: protocol.homeOfficial1, official2: protocol.homeOfficial2 } : { coach: protocol.awayCoach, official1: protocol.awayOfficial1, official2: protocol.awayOfficial2 };
  return ({ coach: "T", official1: "O1", official2: "O2" }[role as "coach" | "official1" | "official2"] || "O") + (names[role as keyof typeof names] ? ` ${names[role as keyof typeof names]}` : "");
};

const flowSymbol = (event: ProtocolEvent) => eventSymbol(event.kind) || "W (obie)";

export async function generateMatchProtocolPdf(match: Match, protocol: MatchProtocolDraft, homePlayers: ProtocolPlayer[], awayPlayers: ProtocolPlayer[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await registerFonts(doc);
  const finalScore = protocolScore(protocol.events);
  const pageCount = Math.max(1, Math.ceil(protocol.events.length / PAGE_EVENT_LIMIT));
  const disciplinaryNotes = protocol.events.filter(event => requiresDisciplinaryDecision(event.kind)).map((event, index) => `${index + 1}. ${event.clock}, ${eventSymbol(event.kind)}: ${event.reason || "-"} [rażące: ${event.grossUnsporting ? "TAK" : "NIE"}]`).join("; ");
  const notes = [disciplinaryNotes, protocol.refereeNotes].filter(Boolean).join("; ") || "-";

  const drawCell = (x: number, y: number, width: number, height: number, value: string, options?: { bold?: boolean; fill?: number; invert?: boolean; size?: number }) => {
    const fill = options?.fill;
    if (fill !== undefined) { doc.setFillColor(fill, fill, fill); doc.rect(x, y, width, height, "F"); }
    doc.setDrawColor(140); doc.setLineWidth(.15); doc.rect(x, y, width, height);
    const ink = options?.invert ? 255 : 0; doc.setTextColor(ink, ink, ink);
    doc.setFont(PDF_FONT, options?.bold ? "bold" : "normal"); doc.setFontSize(options?.size || 5.8);
    const lines = doc.splitTextToSize(value || "", Math.max(2, width - 2)).slice(0, 2);
    const lineHeight = (options?.size || 5.8) * 0.3528;
    const firstLineCenter = y + height / 2 - ((lines.length - 1) * lineHeight) / 2;
    doc.text(lines, x + 1, firstLineCenter, { baseline: "middle", lineHeightFactor: 1 });
    doc.setTextColor(0, 0, 0);
  };

  const drawRoster = (left: number, top: number, width: number, title: string, players: ProtocolPlayer[], dark: boolean, coach: string, officials: string[], timeouts: number, mvpPlayerId: string) => {
    const widths = [7, width - 29, 10, 4, 4, 4];
    const rowHeight = 3.9;
    drawCell(left, top, width, 7, title, { bold: true, fill: dark ? 85 : 230, invert: dark, size: 7 });
    let y = top + 7;
    const foulHeaderHeight = 5.4;
    drawCell(left, y, widths[0] + widths[1] + widths[2], foulHeaderHeight, "", { fill: dark ? 115 : 205, invert: dark });
    drawCell(left + widths[0] + widths[1] + widths[2], y, widths[3] + widths[4] + widths[5], foulHeaderHeight, "Przewinienia\ngłówne", { bold: true, fill: dark ? 115 : 205, invert: dark, size: 4 });
    y += foulHeaderHeight;
    ["Nr", "Nazwisko i imię", "Bramki", "1", "2", "3"].forEach((value, column) => {
      const x = left + widths.slice(0, column).reduce((sum, item) => sum + item, 0);
      drawCell(x, y, widths[column], rowHeight, value, { bold: true, fill: dark ? 115 : 205, invert: dark, size: 5.5 });
    });
    y += rowHeight;
    rosterRows(players, protocol, mvpPlayerId).forEach(row => {
      row.forEach((value, column) => {
        const x = left + widths.slice(0, column).reduce((sum, item) => sum + item, 0);
        drawCell(x, y, widths[column], rowHeight, value, { fill: dark ? 225 : 255, size: 5.4 });
      });
      y += rowHeight;
    });
    drawCell(left, y, 7, rowHeight, "", { fill: dark ? 115 : 225, invert: dark });
    drawCell(left + 7, y, width - 7, rowHeight, `Trener: ${coach || "-"}; Oficjele: ${officials.filter(Boolean).join(", ") || "-"}`, { bold: true, fill: dark ? 115 : 225, invert: dark, size: 5.4 });
    y += rowHeight;
    drawCell(left, y, width, rowHeight, "Time-out:", { bold: true, fill: dark ? 225 : 255, size: 5.5 });
    [0, 1].forEach(index => {
      const boxX = left + 20 + index * 5;
      const boxY = y + .45;
      const boxSize = 3;
      doc.setDrawColor(60); doc.setLineWidth(.25); doc.rect(boxX, boxY, boxSize, boxSize);
      if (timeouts > index) {
        doc.setLineWidth(.35);
        doc.line(boxX + .55, boxY + .55, boxX + boxSize - .55, boxY + boxSize - .55);
        doc.line(boxX + boxSize - .55, boxY + .55, boxX + .55, boxY + boxSize - .55);
      }
    });
  };

  const drawPage = (pageIndex: number) => {
    const pageNumber = pageIndex + 1;
    doc.setTextColor(0); doc.setFont(PDF_FONT, "bold"); doc.setFontSize(14); doc.text("PROTOKÓŁ MECZU PIŁKI WODNEJ", 105, 10, { align: "center" });
    const infoRows = [
      ["Miejsce", match.location || "-", "Data", match.date, "Wynik", `${finalScore.home}:${finalScore.away}`],
      ["Zawody", match.round || "Rozgrywki", "Godzina", match.time || "-", "Status", protocol.status === "approved" ? "Zatwierdzony" : protocol.status === "submitted" ? "Przekazany" : "Roboczy"],
      ["Sędzia I", protocol.referee1 || match.referees[0] || "-", "Sędzia II", protocol.referee2 || match.referees[1] || "-", "Delegat", protocol.delegateName || match.delegate || "-"],
      ["Protokolant", protocol.protocolSecretary || "-", "Sędzia czasu I", protocol.timeSecretary1 || "-", "Sędzia czasu II", protocol.timeSecretary2 || "-"],
      ["Sędzia bramkowy I", protocol.goalSecretary1 || "-", "Sędzia bramkowy II", protocol.goalSecretary2 || "-", "Wynik", `${finalScore.home}:${finalScore.away}`],
    ];
    const infoWidths = [32, 38, 32, 38, 28, 32];
    infoRows.forEach((row, rowIndex) => row.forEach((value, column) => {
      const x = 5 + infoWidths.slice(0, column).reduce((sum, item) => sum + item, 0);
      drawCell(x, 14 + rowIndex * 4, infoWidths[column], 4, value, { bold: column % 2 === 0, fill: column % 2 === 0 ? 235 : 255, size: 5.7 });
    }));
    const rosterY = 37;
    const homeTimeouts = protocol.events.filter(event => event.kind === "timeout" && event.team === "home").length;
    const awayTimeouts = protocol.events.filter(event => event.kind === "timeout" && event.team === "away").length;
    drawRoster(10, rosterY, 93, match.home, homePlayers, false, protocol.homeCoach, [protocol.homeOfficial1, protocol.homeOfficial2], homeTimeouts, protocol.homeMvpPlayerId);
    drawRoster(107, rosterY, 93, match.away, awayPlayers, true, protocol.awayCoach, [protocol.awayOfficial1, protocol.awayOfficial2], awayTimeouts, protocol.awayMvpPlayerId);
    const flowY = rosterY + 86;
    doc.setFont(PDF_FONT, "bold"); doc.setFontSize(10); doc.text("PRZEBIEG GRY", 105, flowY, { align: "center" });
    const pageEvents = protocol.events.slice(pageIndex * PAGE_EVENT_LIMIT, (pageIndex + 1) * PAGE_EVENT_LIMIT);
    for (let tableIndex = 0; tableIndex < 3; tableIndex += 1) {
      const offset = pageIndex * PAGE_EVENT_LIMIT + tableIndex * TABLE_EVENT_LIMIT;
      const events = pageEvents.slice(tableIndex * TABLE_EVENT_LIMIT, (tableIndex + 1) * TABLE_EVENT_LIMIT);
      const body = Array.from({ length: TABLE_EVENT_LIMIT }, (_, rowIndex) => {
        const event = events[rowIndex];
        if (!event) return ["", "", "", "", "", "", ""];
        const absoluteIndex = offset + rowIndex;
        const running = protocolScore(protocol.events.slice(0, absoluteIndex + 1));
        const player = participant(event, event.team === "home" ? homePlayers : awayPlayers, protocol);
        return [String(absoluteIndex + 1), String(event.period), event.period === "PS" ? "-" : event.clock, event.team === "home" ? player : "", event.team === "away" ? player : "", flowSymbol(event), `${running.home}:${running.away}`];
      });
      const x = 10 + tableIndex * 63;
      const widths = [5, 5, 10, 8, 8, 11, 13];
      const rowHeight = 3.25;
      ["Lp.", "K", "Czas", "B", "N", "Sym.", "Wynik"].forEach((value, column) => {
        const cellX = x + widths.slice(0, column).reduce((sum, item) => sum + item, 0);
        const fill = column === 3 ? 210 : column === 4 ? 95 : 75;
        drawCell(cellX, flowY + 2, widths[column], rowHeight, value, { bold: true, fill, invert: column !== 3, size: 4.8 });
      });
      body.forEach((row, rowIndex) => {
        const y = flowY + 2 + rowHeight * (rowIndex + 1);
        const event = events[rowIndex];
        row.forEach((value, column) => {
          const cellX = x + widths.slice(0, column).reduce((sum, item) => sum + item, 0);
          drawCell(cellX, y, widths[column], rowHeight, value, { fill: column === 4 ? 225 : 255, size: 4.8 });
        });
        if (event && (rowIndex === 0 || events[rowIndex - 1]?.period !== event.period)) {
          doc.setDrawColor(25); doc.setLineWidth(.6); doc.line(x, y, x + 60, y);
        }
      });
    }
    const lowerY = flowY + 2 + 26 * 3.25 + 4;
    doc.setFont(PDF_FONT, "normal"); doc.setFontSize(5.4);
    doc.text("Legenda: G - gol; noG - niewykorzystany rzut karny w serii; W - wykluczenie 20 s; K - rzut karny; WZ - wykluczenie z prawem zamiany; WB - brutalność; To - time-out; ŻK - żółta kartka; CZK - czerwona kartka; Kof - karny za działanie oficjela.", 10, lowerY, { maxWidth: 190 });
    if (pageIndex === pageCount - 1) {
      doc.setFont(PDF_FONT, "bold"); doc.text("Uwagi sędziowskie:", 10, lowerY + 7);
      doc.setFont(PDF_FONT, "normal"); doc.text(notes, 10, lowerY + 11, { maxWidth: 125 });
      doc.setFont(PDF_FONT, "bold"); doc.text(`Godzina zakończenia: ${protocol.finishedAt || "-"}`, 142, lowerY + 7);
      doc.text(`Protest: ${protocol.protest ? "TAK" : "NIE"}`, 142, lowerY + 12);
      const homeMvp = protocol.homePlayers.find(player => player.id === protocol.homeMvpPlayerId);
      const awayMvp = protocol.awayPlayers.find(player => player.id === protocol.awayMvpPlayerId);
      doc.text(`MVP jasnych: ${homeMvp ? `#${homeMvp.capNumber} ${homeMvp.name}` : "-"}`, 142, lowerY + 17, { maxWidth: 58 });
      doc.text(`MVP ciemnych: ${awayMvp ? `#${awayMvp.capNumber} ${awayMvp.name}` : "-"}`, 142, lowerY + 22, { maxWidth: 58 });
    }
    doc.setDrawColor(0); doc.setLineWidth(.2); doc.setFont(PDF_FONT, "normal"); doc.setFontSize(6.2);
    const signatures = [["Sędzia I", protocol.referee1 || match.referees[0] || ""], ["Sędzia II", protocol.referee2 || match.referees[1] || ""], ["Protokolant", protocol.protocolSecretary || ""], ["Delegat", protocol.delegateName || match.delegate || ""]];
    signatures.forEach(([label, name], index) => { const x = 10 + index * 48; doc.line(x, 276, x + 42, 276); doc.text(`${label}${name ? `: ${name}` : ""}`, x + 21, 280, { align: "center", maxWidth: 42 }); });
    doc.setFontSize(5.5); doc.text(`Strona ${pageIndex + 1} z ${pageCount}`, 200, 290, { align: "right" });
  };

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) doc.addPage();
    drawPage(pageIndex);
  }
  doc.save(`protokol-${match.home}-${match.away}-${match.date}.pdf`.replace(/[^a-zA-Z0-9.-]+/g, "_"));
}
