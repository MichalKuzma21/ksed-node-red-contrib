export interface AuthenticateWorkflowParams {
  pemKey: BufferSource;
  x509cert: string;
  algo: RsaHashedImportParams | EcKeyImportParams;
}

export interface AuthenticateWorkflowResponse {
  accessToken: string;
  accessTokenValidUntil: string;
  refreshToken: string;
  refreshTokenValidUntil: string;
}
