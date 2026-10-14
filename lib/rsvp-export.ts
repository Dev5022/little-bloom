export type GuestResponse = {
  id: string;
  name: string;
  attendance: "yes" | "no";
  guests: number;
  message: string;
  createdAt: string;
};

export function csvCell(value: string | number): string {
  let text = String(value);
  // A quoted CSV cell can still be interpreted as a spreadsheet formula.
  if (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function guestListCsv(rows: GuestResponse[]): string {
  const lines = [
    ["Name", "Attendance", "Guests (including respondent)", "Wishes", "Submitted (UTC)"],
    ...rows.map(row => [row.name, row.attendance === "yes" ? "Attending" : "Unable to attend",
      row.guests, row.message, row.createdAt]),
  ];
  return `\uFEFF${lines.map(line => line.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
