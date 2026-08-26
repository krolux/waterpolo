import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Match } from "../types/wpolo";
import { eventSymbol, playerGoals, playerMajorFouls, protocolScore, requiresDisciplinaryDecision, type MatchProtocolDraft, type ProtocolPlayer } from "./matchProtocol";

const PDF_FONT = "NotoSans";
function binary(buffer: ArrayBuffer) { const bytes = new Uint8Array(buffer); let value = ""; for (let i = 0; i < bytes.length; i += 0x8000) value += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return value; }
async function registerFonts(doc: jsPDF) {
  const [regular, bold] = await Promise.all([fetch("/fonts/NotoSans-Regular.ttf"), fetch("/fonts/NotoSans-Bold.ttf")]);
  if (!regular.ok || !bold.ok) throw new Error("Nie udało się załadować fontów protokołu PDF.");
  doc.addFileToVFS("NotoSans-Regular.ttf", binary(await regular.arrayBuffer())); doc.addFont("NotoSans-Regular.ttf", PDF_FONT, "normal");
  doc.addFileToVFS("NotoSans-Bold.ttf", binary(await bold.arrayBuffer())); doc.addFont("NotoSans-Bold.ttf", PDF_FONT, "bold");
}

const rows = (players: ProtocolPlayer[], protocol: MatchProtocolDraft) => Array.from({ length: 15 }, (_, index) => {
  const player = players.find(item => item.slot === index + 1);
  const fouls = player ? playerMajorFouls(protocol.events, player.id) : 0;
  return [String(index + 1), player?.name || "", player ? String(playerGoals(protocol.events, player.id)) : "", fouls > 0 ? "X" : "", fouls > 1 ? "X" : "", fouls > 2 ? "X" : ""];
});

export async function generateMatchProtocolPdf(match: Match, protocol: MatchProtocolDraft, homePlayers: ProtocolPlayer[], awayPlayers: ProtocolPlayer[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await registerFonts(doc);
  const score = protocolScore(protocol.events);
  doc.setFont(PDF_FONT, "bold"); doc.setFontSize(15); doc.text("PROTOKÓŁ MECZU PIŁKI WODNEJ", 105, 12, { align: "center" });
  doc.setFont(PDF_FONT, "normal"); doc.setFontSize(8);
  autoTable(doc, { startY: 16, theme: "grid", styles: { font: PDF_FONT, fontSize: 7, cellPadding: 1 }, body: [
    ["Miejsce", match.location || "-", "Data", match.date, "Wynik", `${score.home}:${score.away}`],
    ["Zawody", match.round || "Rozgrywki", "Godzina", match.time || "-", "Delegat", match.delegate || "-"],
    ["Arbiter I", match.referees[0] || "-", "Arbiter II", match.referees[1] || "-", "Koniec", protocol.finishedAt || "-"],
  ] });
  const y = (doc as any).lastAutoTable.finalY + 3;
  const teamWidth = 91;
  autoTable(doc, { startY: y, margin: { left: 12, right: 107 }, theme: "grid", styles: { font: PDF_FONT, fontSize: 6.5, cellPadding: .8 }, head: [[match.home, "", "", "", "", ""], ["Nr", "Nazwisko i imię", "Bramki", "1", "2", "3"]], body: rows(homePlayers, protocol), foot: [["", `Trener: ${protocol.homeCoach || "-"}`, "", "", "", ""]], columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 54 }, 2: { cellWidth: 12 }, 3: { cellWidth: 5.5 }, 4: { cellWidth: 5.5 }, 5: { cellWidth: 5.5 } }, tableWidth: teamWidth });
  autoTable(doc, { startY: y, margin: { left: 107, right: 12 }, theme: "grid", styles: { font: PDF_FONT, fontSize: 6.5, cellPadding: .8, fillColor: [224, 242, 254] }, head: [[match.away, "", "", "", "", ""], ["Nr", "Nazwisko i imię", "Bramki", "1", "2", "3"]], body: rows(awayPlayers, protocol), foot: [["", `Trener: ${protocol.awayCoach || "-"}`, "", "", "", ""]], columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 54 }, 2: { cellWidth: 12 }, 3: { cellWidth: 5.5 }, 4: { cellWidth: 5.5 }, 5: { cellWidth: 5.5 } }, tableWidth: teamWidth });
  const gameY = Math.max((doc as any).lastAutoTable.finalY, y + 94) + 4;
  doc.setFont(PDF_FONT, "bold"); doc.setFontSize(11); doc.text("PRZEBIEG GRY", 105, gameY, { align: "center" });
  autoTable(doc, { startY: gameY + 2, theme: "grid", styles: { font: PDF_FONT, fontSize: 6.2, cellPadding: .65 }, head: [["Lp.", "Kwarta", "Czas", "B/N", "Zawodnik", "Symbol", "Wynik"]], body: protocol.events.slice(0, 45).map((event, index) => { const running = protocolScore(protocol.events.slice(0, index + 1)); const players = event.team === "home" ? homePlayers : awayPlayers; return [index + 1, event.period, event.clock, event.team === "home" ? "B" : "N", players.find(player => player.id === event.playerId)?.capNumber || "-", eventSymbol(event.kind), `${running.home}:${running.away}`]; }) });
  let footerY = (doc as any).lastAutoTable.finalY + 4;
  if (footerY > 265) { doc.addPage(); footerY = 16; }
  const disciplinaryNotes = protocol.events.filter(event => requiresDisciplinaryDecision(event.kind)).map((event, index) => `${index + 1}. ${event.clock}, ${eventSymbol(event.kind)}: ${event.reason || "-"} [rażące zachowanie: ${event.grossUnsporting ? "TAK" : "NIE"}]`).join("; ");
  const notes = [disciplinaryNotes, protocol.refereeNotes].filter(Boolean).join("; ") || "-";
  doc.setFont(PDF_FONT, "normal"); doc.setFontSize(7); doc.text(`Uwagi sędziowskie: ${notes}`, 12, footerY, { maxWidth: 186 });
  doc.text(`Protest: ${protocol.protest ? "TAK" : "NIE"}   Zamknął: ${protocol.closedBy || "-"}`, 12, footerY + 8);
  doc.save(`protokol-${match.home}-${match.away}-${match.date}.pdf`.replace(/[^a-zA-Z0-9.-]+/g, "_"));
}
