export interface DownloadInvoiceWorkflowParams {
  authToken: string;
  ksefNumber: string;
}

export interface DownloadInvoiceWorkflowResponse {
  xmlContent: string;
}
