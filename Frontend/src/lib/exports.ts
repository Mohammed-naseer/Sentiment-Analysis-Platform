import jsPDF from "jspdf";

export type ExportRow = Record<string, string | number>;

export function downloadCSV(filename: string, rows: ExportRow[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export function downloadPDF(filename: string, title: string, rows: ExportRow[], summary?: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let y = 56;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, marginX, y);
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleString(), marginX, y);
  doc.setTextColor(30);
  y += 24;

  if (summary) {
    doc.setFontSize(11);
    const wrapped = doc.splitTextToSize(summary, 515);
    doc.text(wrapped, marginX, y);
    y += wrapped.length * 14 + 12;
  }

  if (rows.length) {
    const headers = Object.keys(rows[0]);
    const colW = 515 / headers.length;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    headers.forEach((h, i) => doc.text(String(h), marginX + i * colW, y));
    y += 6;
    doc.setDrawColor(200);
    doc.line(marginX, y, marginX + 515, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    rows.forEach((r) => {
      if (y > 780) { doc.addPage(); y = 56; }
      headers.forEach((h, i) => {
        const text = doc.splitTextToSize(String(r[h] ?? ""), colW - 6);
        doc.text(text.slice(0, 1), marginX + i * colW, y);
      });
      y += 16;
    });
  }

  doc.save(filename);
}

export function printReport(title: string, rows: ExportRow[], summary?: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const html = `<!doctype html><html><head><title>${title}</title>
<style>
  body{font-family:Inter,system-ui,sans-serif;padding:40px;color:#0f172a}
  h1{font-size:22px;margin:0 0 4px}
  .meta{color:#64748b;font-size:12px;margin-bottom:16px}
  .summary{background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px;font-size:13px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0}
  th{background:#f1f5f9;text-transform:uppercase;letter-spacing:.06em;font-size:10px;color:#475569}
</style></head><body>
<h1>${title}</h1>
<div class="meta">Generated ${new Date().toLocaleString()}</div>
${summary ? `<div class="summary">${summary}</div>` : ""}
${rows.length ? `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${String(r[h] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>` : ""}
<script>window.onload=()=>{window.print();}</script>
</body></html>`;
  w.document.write(html);
  w.document.close();
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}