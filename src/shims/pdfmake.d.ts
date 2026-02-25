// types/pdfmake.d.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'pdfmake/build/pdfmake' {
  import type { TCreatedPdf } from 'pdfmake/interfaces';
  const pdfMake: {
    createPdf(docDefinition: any): TCreatedPdf;
    vfs: Record<string, string>; // <- dodajemy vfs
  };
  export default pdfMake;
  export type { TCreatedPdf };
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: { vfs: Record<string, string> };
  export default pdfFonts;
}

declare module 'pdfmake/interfaces' {
  export type Content = any;
  export type ContentTable = any;
  export type ContentText = any;
  export type TableCell = any;
  export type ContentStack = any;
  export type Margins = any;
  export type Style = any;
  export type TDocumentDefinitions = any;
  export type ContentQr = any;

  export type Column = any;
  export type CustomTableLayout = any;
}
