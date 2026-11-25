import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface PageSection {
  title: string;
  subtitle: string;
  blocks: Array<{ heading: string; lines: string[] }>;
  suggestedRows: number;
}

const SAMPLE_PAGES: PageSection[] = [
  {
    title: 'Sueter Brisa de Otono',
    subtitle: 'Patron de tejido a dos agujas (Muestra de Ravelry) — Pagina 1 de 4',
    suggestedRows: 12,
    blocks: [
      {
        heading: 'Materiales y Muestra de Tension',
        lines: [
          '- Hilado: Lana merino DK (aprox. 220 m / 100 g) — 5 madejas.',
          '- Agujas: Circulares de 4.0 mm (elastico) y 4.5 mm (cuerpo).',
          '- Tension: 20 puntos x 28 vueltas = 10 x 10 cm en punto jersey.',
          '- Tallas: S (M, L, XL) — contorno de pecho 94 (104, 114, 124) cm.',
        ],
      },
      {
        heading: 'Seccion 1: Cuello en Punto Elastico 1x1',
        lines: [
          'Montar 88 (92, 96, 100) puntos con agujas de 4.0 mm.',
          'Colocar marcador de inicio de vuelta y unir en redondo.',
          'Vueltas 1 a 12: *1 punto derecho, 1 punto reves*; repetir hasta el final.',
          'Tip: Usa el contador de esta pagina para llevar las 12 vueltas del cuello.',
        ],
      },
    ],
  },
  {
    title: 'Canesu Circular con Aumentos Raglan',
    subtitle: 'Sueter Brisa de Otono — Pagina 2 de 4',
    suggestedRows: 36,
    blocks: [
      {
        heading: 'Distribucion de Marcadores',
        lines: [
          'Cambiar a agujas de 4.5 mm. Colocar marcadores en la primera vuelta:',
          '14 (15, 16, 17) pts manga der, M, 30 (31, 32, 33) pts delantero, M,',
          '14 (15, 16, 17) pts manga izq, M, 30 (31, 32, 33) pts espalda, M.',
        ],
      },
      {
        heading: 'Ritmo de Aumentos (36 vueltas en total)',
        lines: [
          'Vuelta de aumentos (impar): *Tejer derecho hasta 1 pt antes de M, Aum1D,',
          '1 der, pasar M, 1 der, Aum1I*; repetir en los 4 marcadores (+8 pts).',
          'Vuelta de descanso (par): Tejer todos los puntos del derecho.',
          'Repetir estas 2 vueltas hasta completar 36 vueltas de canesu.',
        ],
      },
    ],
  },
  {
    title: 'Cuerpo y Cenefa Calada',
    subtitle: 'Sueter Brisa de Otono — Pagina 3 de 4',
    suggestedRows: 48,
    blocks: [
      {
        heading: 'Separacion de Mangas',
        lines: [
          'Dejar en espera los puntos de ambas mangas en lana de desecho.',
          'Montar 6 puntos bajo cada sisa usando montaje retorcido.',
          'Continuar tejiendo el cuerpo en punto jersey durante 40 vueltas.',
        ],
      },
      {
        heading: 'Cenefa Calada Inferior (8 vueltas)',
        lines: [
          'Vueltas 1 y 3: *2 pts juntos al der, hebra, 2 pts der*; repetir.',
          'Vueltas 2, 4, 6, 8: Todo del derecho.',
          'Vueltas 5 y 7: *2 pts der, hebra, SSK*; repetir hasta el marcador.',
        ],
      },
    ],
  },
  {
    title: 'Mangas y Acabados Finales',
    subtitle: 'Sueter Brisa de Otono — Pagina 4 de 4',
    suggestedRows: 44,
    blocks: [
      {
        heading: 'Tejido de Cada Manga',
        lines: [
          'Retomar los puntos en espera de la manga y levantar 6 pts en la sisa.',
          'Tejer en redondo 6 vueltas rectas en punto jersey.',
          'Disminuciones: cada 6 vueltas tejer 2 pts juntos al inicio y SSK al final.',
          'Continuar hasta completar 44 vueltas desde la sisa.',
        ],
      },
      {
        heading: 'Puno y Bloqueo',
        lines: [
          'Cambiar a agujas de 4.0 mm y tejer 10 vueltas en punto elastico 1x1.',
          'Cerrar todos los puntos suavemente siguiendo el punto.',
          'Rematar hebras, lavar a mano con agua tibia y bloquear en plano.',
        ],
      },
    ],
  },
];

/**
 * Generates an in-memory multi-page PDF pattern for quick testing & onboarding.
 */
export async function generateSamplePatternPdf(): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  SAMPLE_PAGES.forEach((section, index) => {
    const page = doc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    // Top accent bar
    page.drawRectangle({
      x: 0,
      y: height - 16,
      width,
      height: 16,
      color: rgb(0.78, 0.29, 0.19),
    });

    // Header badge
    page.drawRectangle({
      x: 48,
      y: height - 72,
      width: 155,
      height: 22,
      color: rgb(0.95, 0.91, 0.86),
    });
    page.drawText(`PAGINA ${index + 1} DE ${SAMPLE_PAGES.length}`, {
      x: 58,
      y: height - 65,
      size: 10,
      font: fontBold,
      color: rgb(0.55, 0.2, 0.12),
    });

    // Title
    page.drawText(section.title, {
      x: 48,
      y: height - 115,
      size: 22,
      font: fontBold,
      color: rgb(0.17, 0.14, 0.12),
    });

    page.drawText(section.subtitle, {
      x: 48,
      y: height - 138,
      size: 11,
      font: fontRegular,
      color: rgb(0.45, 0.39, 0.34),
    });

    // Divider line
    page.drawLine({
      start: { x: 48, y: height - 155 },
      end: { x: width - 48, y: height - 155 },
      thickness: 1,
      color: rgb(0.88, 0.84, 0.78),
    });

    let cursorY = height - 195;

    for (const block of section.blocks) {
      page.drawText(block.heading, {
        x: 48,
        y: cursorY,
        size: 14,
        font: fontBold,
        color: rgb(0.78, 0.29, 0.19),
      });
      cursorY -= 24;

      for (const line of block.lines) {
        page.drawText(line, {
          x: 56,
          y: cursorY,
          size: 11.5,
          font: fontRegular,
          color: rgb(0.2, 0.17, 0.15),
        });
        cursorY -= 20;
      }
      cursorY -= 18;
    }

    // Bottom checklist box for row progress
    page.drawRectangle({
      x: 48,
      y: 95,
      width: width - 96,
      height: 76,
      color: rgb(0.97, 0.95, 0.92),
      borderColor: rgb(0.86, 0.81, 0.74),
      borderWidth: 1,
    });
    page.drawText(`Meta sugerida para esta pagina: ${section.suggestedRows} vueltas`, {
      x: 64,
      y: 140,
      size: 11.5,
      font: fontBold,
      color: rgb(0.18, 0.43, 0.3),
    });
    page.drawText(
      'Usa el panel derecho para actualizar tu contador, anadir notas o mover la guia de lectura.',
      {
        x: 64,
        y: 117,
        size: 10.5,
        font: fontRegular,
        color: rgb(0.38, 0.33, 0.29),
      }
    );

    // Footer
    page.drawText('Ravelry Pattern Studio — Patron de ejemplo interactivo', {
      x: 48,
      y: 45,
      size: 9,
      font: fontRegular,
      color: rgb(0.55, 0.5, 0.45),
    });
  });

  const pdfBytes = await doc.save();
  return pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer;
}
