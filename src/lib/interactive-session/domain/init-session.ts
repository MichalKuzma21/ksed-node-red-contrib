export interface InitSessionWorkflowResponse {
  referenceNumber: string;
  aesKeyBase64: string;
  ivBase64: string;
}

export interface InitSessionWorkflowParams {
  accessToken: string;
  formCodeSystemCode: string;
  formCodeSchemaVersion: string;
  formCodeValue: string;
}
