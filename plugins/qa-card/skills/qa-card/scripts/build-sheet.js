// Builds a standalone .xlsx with one test-case sheet in the standard format.
// Usage: node build-sheet.js <cases.json> [outDir]
// cases.json: see ../examples/cases.example.json
// Optional config (~/.qa-card/config.json): { "tester": "...", "logo": "C:/path/logo.png", "outDir": "..." }
const fs = require('fs');
const os = require('os');
const path = require('path');
const ExcelJS = require('exceljs');

const cfgPath = path.join(os.homedir(), '.qa-card', 'config.json');
const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
const [casesPath, outArg] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
const outDir = outArg || cfg.outDir || path.join(os.homedir(), 'Downloads');
const tester = spec.tester || cfg.tester || '';
const fecha = spec.fecha || (d => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`)(new Date());

const thin = { style: 'thin', color: { argb: 'FF000000' } };
const box = { left: thin, right: thin, top: thin, bottom: thin };
const tahoma = { name: 'Tahoma', size: 10 };
const verdana8 = { name: 'Verdana', size: 8 };
const resultFont = {
  EXITOSO: { name: 'Verdana', size: 10, bold: true, color: { argb: 'FF00B050' } },
  FALLIDO: { name: 'Verdana', size: 10, bold: true, color: { argb: 'FFFF0000' } },
};
const HEADERS = ['Fecha', 'Tipo de Prueba', 'Criterio de aceptación', 'Ciclo', 'Prerequisitos', 'Resultados Obtenidos', 'Resultados Esperados', 'Observaciones', 'Link de Issue', 'Nombre Tester'];
const WIDTHS = [12, 21.3, 28.4, 16.7, 19.7, 17.1, 28.7, 28.1, 28.1, 11.4];

(async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(spec.sheet);
  WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  ws.mergeCells('A1:J3');
  const title = ws.getCell('A1');
  title.value = `Documentación Casos de Prueba - ${spec.system}`;
  title.font = { name: 'Verdana', size: 14, bold: true, color: { argb: 'FF4472C4' } };
  title.alignment = { horizontal: 'center', vertical: 'bottom' };
  const logoPath = spec.logo || cfg.logo;
  if (logoPath && fs.existsSync(logoPath)) {
    const logo = wb.addImage({ filename: logoPath, extension: path.extname(logoPath).slice(1).toLowerCase() === 'jpg' ? 'jpeg' : path.extname(logoPath).slice(1).toLowerCase() });
    ws.addImage(logo, { tl: { col: 0.01, row: 0.01 }, ext: { width: 88, height: 53 } });
  }

  const head = ws.getRow(4);
  head.height = 25.5;
  HEADERS.forEach((h, i) => {
    const c = head.getCell(i + 1);
    c.value = h;
    c.font = { name: i === 3 ? 'Tahoma' : 'Verdana', size: 10, bold: true };
    c.border = box;
    c.alignment = { wrapText: true, vertical: 'bottom' };
  });

  spec.cases.forEach((k, i) => {
    const r = ws.getRow(5 + i);
    const vals = [fecha, k.tipo || 'Funcional', k.criterio, k.ciclo || 1, k.prerequisitos, k.resultado, k.esperado, k.observaciones || 'No hay observaciones', '', tester];
    vals.forEach((v, j) => {
      const c = r.getCell(j + 1);
      c.value = v;
      c.border = box;
      c.alignment = { wrapText: true, vertical: 'bottom' };
      c.font = j === 1 || j === 7 ? verdana8 : tahoma;
    });
    r.getCell(4).font = { name: 'Verdana', size: 12, bold: true };
    r.getCell(4).alignment = { horizontal: 'right', vertical: 'bottom' };
    r.getCell(6).font = resultFont[k.resultado] || tahoma;
    const longest = Math.max(...[k.criterio, k.prerequisitos, k.esperado, k.observaciones || ''].map(t => String(t).length / 26));
    r.height = Math.max(38.25, Math.ceil(longest) * 13 + 6);
    ws.getCell(`B${5 + i}`).dataValidation = { type: 'list', allowBlank: true, formulae: ['"Funcional,Unidad,Integridad"'] };
  });

  if (spec.descripcion) {
    const d0 = 4 + spec.cases.length + 5;
    ws.mergeCells(`B${d0}:C${d0 + 3}`);
    const desc = ws.getCell(`B${d0}`);
    desc.value = `Descripcion: ${spec.descripcion}`;
    desc.font = { name: 'Times New Roman', size: 11 };
    desc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    desc.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  }

  const out = path.join(outDir, `Caso de Prueba - ${spec.sheet}.xlsx`);
  await wb.xlsx.writeFile(out);
  console.log('written', out);
})();
