export interface RefreshTokenWorkflowParams {
  tokenValue: string;
}

export interface RefreshTokenWorkflowResponse {
  newTokenValue: string;
  newTokenValidUntil: string;
}
