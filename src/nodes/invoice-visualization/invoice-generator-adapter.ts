/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import {
  Faktura,
  Faktura as Faktura1,
} from '@akmf/ksef-fe-invoice-converter/src/lib-public/types/fa1.types';
import { Faktura as Faktura2 } from '@akmf/ksef-fe-invoice-converter/src/lib-public/types/fa2.types';
import { Faktura as Faktura3 } from '@akmf/ksef-fe-invoice-converter/src/lib-public/types/fa3.types';
import { generateFA1 } from '@akmf/ksef-fe-invoice-converter/src/lib-public/FA1-generator';
import { generateFA2 } from '@akmf/ksef-fe-invoice-converter/src/lib-public/FA2-generator';
import { generateFA3 } from '@akmf/ksef-fe-invoice-converter/src/lib-public/FA3-generator';
import { TCreatedPdf } from 'pdfmake/build/pdfmake';
import { xml2js } from 'xml-js';

/*
  VIBE CODED
*/

export class InvoiceGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'InvoiceGenerationError';
  }
}
export interface InvoiceGenerationInput {
  xmlContent: string;
  ksefNumber: string;
  qrCodeURL: string;
  isMobile: boolean;
}

export interface InvoiceGenerationOptions {
  outputFormat?: 'base64' | 'buffer' | 'blob';
}

export function stripPrefixes<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(stripPrefixes) as T;
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]: [string, T]): [string, T] => [
        key.includes(':') ? key.split(':')[1] : key,
        stripPrefixes(value),
      ]),
    ) as T;
  }
  return obj;
}

export function parseXML(file: File): Promise<unknown> {
  return new Promise((resolve, reject): void => {
    const reader = new FileReader();

    reader.onload = function (e: ProgressEvent<FileReader>): void {
      try {
        const xmlStr: string = e.target?.result as string;
        const jsonDoc: Faktura = stripPrefixes(xml2js(xmlStr, { compact: true })) as Faktura;

        resolve(jsonDoc);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}
export class InvoiceGeneratorAdapter {
  private validateInput(input: InvoiceGenerationInput): void {
    if (!input.xmlContent?.trim()) throw new InvoiceGenerationError('XML content is empty');
    if (!input.ksefNumber) throw new InvoiceGenerationError('KSeF number is required');
    if (!input.qrCodeURL) throw new InvoiceGenerationError('QR code URL is required');
  }

  async generateInvoice(
    input: InvoiceGenerationInput,
    options: InvoiceGenerationOptions = {},
  ): Promise<string | Buffer> {
    this.validateInput(input);

    try {
      // 1️⃣ dynamiczny import xml2js i stripPrefixes

      const jsonDoc: any = stripPrefixes(xml2js(input.xmlContent, { compact: true }));

      const wersja: string = jsonDoc?.Faktura?.Naglowek?.KodFormularza?._attributes?.kodSystemowy;
      const metadata = {
        nrKSeF: input.ksefNumber,
        qrCode: input.qrCodeURL,
        isMobile: input.isMobile,
      };

      let pdf: TCreatedPdf;
      switch (wersja) {
        case 'FA (1)':
          pdf = generateFA1(jsonDoc.Faktura as Faktura1, metadata);
          break;
        case 'FA (2)':
          pdf = generateFA2(jsonDoc.Faktura as Faktura2, metadata);
          break;
        case 'FA (3)':
          pdf = generateFA3(jsonDoc.Faktura as Faktura3, metadata);
          break;
        default:
          throw new InvoiceGenerationError(`Unsupported FA version: ${wersja}`);
      }

      // 2️⃣ Promise wrapper dla pdf.getBase64 (callback)
      const base64 = await new Promise<string>((resolve, reject) => {
        try {
          pdf.getBase64((data: string) => {
            if (!data) reject(new InvoiceGenerationError('PDF generation returned empty base64'));
            else resolve(data);
          });
        } catch (err) {
          reject(new InvoiceGenerationError('PDF generation failed', err));
        }
      });

      return options.outputFormat === 'buffer' ? Buffer.from(base64, 'base64') : base64;
    } catch (error) {
      if (error instanceof InvoiceGenerationError) throw error;
      throw new InvoiceGenerationError('Failed to generate invoice PDF', error);
    }
  }
}

export const invoiceGenerator = new InvoiceGeneratorAdapter();
