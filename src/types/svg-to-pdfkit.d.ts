declare module 'svg-to-pdfkit' {
  import type PDFKit from 'pdfkit';

  type PreserveAspectRatio =
    | 'none'
    | 'xMinYMin meet'
    | 'xMidYMin meet'
    | 'xMaxYMin meet'
    | 'xMinYMid meet'
    | 'xMidYMid meet'
    | 'xMaxYMid meet'
    | 'xMinYMax meet'
    | 'xMidYMax meet'
    | 'xMaxYMax meet'
    | 'xMinYMin slice'
    | 'xMidYMin slice'
    | 'xMaxYMin slice'
    | 'xMinYMid slice'
    | 'xMidYMid slice'
    | 'xMaxYMid slice'
    | 'xMinYMax slice'
    | 'xMidYMax slice'
    | 'xMaxYMax slice';

  interface SvgToPdfOptions {
    width?: number;
    height?: number;
    preserveAspectRatio?: PreserveAspectRatio;
  }

  export default function SVGtoPDF(
    doc: PDFKit.PDFDocument,
    svg: string,
    x: number,
    y: number,
    options?: SvgToPdfOptions,
  ): PDFKit.PDFDocument;
}
