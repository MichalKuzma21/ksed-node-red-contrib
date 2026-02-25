export interface SendInvoiceWorklowParams {
  maxRetries: number;
  intervalMs: number;
  accessToken: string;
  aesKeyBase64: string;
  ivBase64: string;
  referenceNumber: string;
  invoiceXml: string;
}

export interface SendInvoiceWorklowResponse {
  ordinalNumber: number;
  invoiceNumber?: string;
  ksefNumber?: string;
  referenceNumber: string;
  invoiceHash: string;
  invoiceFileName?: string;
  acquisitionDate?: string;
  invoicingDate: string;
  permanentStorageDate?: string;
  upoDownloadUrl?: string;
  upoDownloadUrlExpirationDate?: string;
  invoicingMode?: string;
  code: number;
  description: string;
  details?: Array<string> | null;
  extensions?: {
    [key: string]: string | null;
  } | null;
}
