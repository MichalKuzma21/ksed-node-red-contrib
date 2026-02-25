import { create } from 'xmlbuilder2';

interface ContextIdentifier {
  Value: string;
  Type: string;
}

export class AuthTokenRequestBuilder {
  private challenge!: string;
  private contextIdentifier!: ContextIdentifier;
  private subjectIdentifierType!: 'certificateSubject' | 'certificateFingerprint';
  private allowedIps: string[] = [];
  private xmlns: string = 'http://ksef.mf.gov.pl/auth/token/2.0';

  setChallenge(challenge: string) {
    this.challenge = challenge;
    return this;
  }

  setContextIdentifier(context: ContextIdentifier) {
    this.contextIdentifier = context;
    return this;
  }

  setSubjectIdentifierType(type: 'certificateSubject' | 'certificateFingerprint') {
    this.subjectIdentifierType = type;
    return this;
  }

  addAllowedIp(ip: string) {
    this.allowedIps.push(ip);
    return this;
  }

  setNamespace(xmlns: string) {
    this.xmlns = xmlns;
    return this;
  }

  build(): string {
    const contextObj: Record<string, string> = {
      [this.contextIdentifier.Type]: this.contextIdentifier.Value,
    };
    const xmlObj: {
      AuthTokenRequest: {
        '@xmlns': string;
        Challenge: string;
        ContextIdentifier: Record<string, string>;
        SubjectIdentifierType: string;
        AuthorizationPolicy?: { AllowedIps: { Ip4Address: string[] } };
      };
    } = {
      AuthTokenRequest: {
        '@xmlns': this.xmlns,
        Challenge: this.challenge,
        ContextIdentifier: contextObj,
        SubjectIdentifierType: this.subjectIdentifierType,
      },
    };

    if (this.allowedIps.length > 0) {
      xmlObj.AuthTokenRequest.AuthorizationPolicy = {
        AllowedIps: { Ip4Address: this.allowedIps },
      };
    }

    const writerOptions = {
      prettyPrint: true,
      headless: false,
      encoding: 'UTF-8',
    };

    return create(xmlObj).end(writerOptions);
  }
}
