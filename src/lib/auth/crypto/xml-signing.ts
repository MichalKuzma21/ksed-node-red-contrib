import * as xadesjs from 'xadesjs';
import { Crypto } from '@peculiar/webcrypto';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import xpath from 'xpath';
import * as XmlDSigJs from 'xmldsigjs';
import { Effect } from 'effect';
import { setNodeDependencies } from 'xml-core';

import {
  XMLParserError,
  XMLSigningError,
  XMLSignatureAppendingError,
  KeyImportError,
} from './xml/errors';

import { KsefSignedXml } from './xml/ksef-signed-xml';

xadesjs.Application.setEngine('NodeJS', new Crypto());

setNodeDependencies({
  DOMParser,
  XMLSerializer,
  Document: DOMParser,
  xpath,
});

export const parseXMLString = (xml: string) =>
  Effect.try({
    try: () => new DOMParser().parseFromString(xml, 'application/xml'),
    catch: (cause) =>
      new XMLParserError({
        message: "Couldn't parse provided XML string",
        cause,
      }),
  });

export const importPrivateKey = (
  der: BufferSource,
  format: 'spki' | 'pkcs8' | 'raw',
  alogrithmIdentifier: RsaHashedImportParams | EcKeyImportParams,
) =>
  Effect.tryPromise({
    try: () =>
      xadesjs.Application.crypto.subtle.importKey(format, der, alogrithmIdentifier, false, [
        'sign',
      ]),
    catch: (cause) =>
      new KeyImportError({
        message: "Can't import private key",
        cause,
      }),
  });

type SignedDocumentTuple = [Document, KsefSignedXml];

export const appendFixedSignature = ([xmlDoc, ksefXML]: SignedDocumentTuple) =>
  Effect.try({
    try: () => {
      const root = xmlDoc.documentElement;
      const signatureNode = ksefXML.GetXml();

      const sigInfo = ksefXML.XmlSignature.SignedInfo;

      let spRef: XmlDSigJs.Reference | null = null;

      sigInfo.References.ForEach((ref) => {
        if (ref.Type === 'http://uri.etsi.org/01903#SignedProperties') {
          spRef = ref;
        }
      });

      if (spRef) {
        const exc14n = new XmlDSigJs.XmlDsigExcC14NTransform();
        (spRef as XmlDSigJs.Reference).Transforms.Add(exc14n);
      } else {
        throw Error('SignedProperties reference not found, XAdES may be invalid!');
      }
      root.appendChild(signatureNode!);
      return xmlDoc;
    },
    catch: (cause) =>
      new XMLSignatureAppendingError({
        message: "Can't append XML signature",
        cause,
      }),
  });

export const serializeXmlDocument = (xmlDoc: Document) =>
  Effect.try({
    try: () => new XMLSerializer().serializeToString(xmlDoc),
    catch: (cause) =>
      new XMLSigningError({
        message: "Can't serialize XML document",
        cause,
      }),
  });

const mapImportToSignAlgorithm = (algorithm: EcKeyImportParams | RsaHashedImportParams) =>
  Effect.try({
    try: () => {
      if (!algorithm?.name) {
        throw new Error('Algorithm is undefined or missing name');
      }

      switch (algorithm.name) {
        case 'ECDSA':
          return {
            name: 'ECDSA',
            hash: { name: 'SHA-256' },
          };

        case 'RSASSA-PKCS1-v1_5':
          return {
            name: 'RSASSA-PKCS1-v1_5',
            hash: { name: 'SHA-256' },
          };

        default:
          throw new Error(`Unsupported algorithm: ${algorithm.name}`);
      }
    },
    catch: (cause) =>
      new XMLSigningError({
        message: "Can't map import algorithm to sign algorithm",
        cause,
      }),
  });

export const signXMLDocument =
  (algorithm: RsaHashedImportParams | EcKeyImportParams) =>
  (privateKey: CryptoKey) =>
  (xmlDoc: Document) =>
  (x509Certificate: string) =>
    Effect.Do.pipe(
      Effect.tap(() => Effect.logDebug('Using algo', { algo: algorithm })),
      Effect.bind('signedXml', () => Effect.sync(() => new KsefSignedXml())),
      Effect.bind('mappedAlgo', () => mapImportToSignAlgorithm(algorithm)),
      Effect.tap(({ signedXml, mappedAlgo }) =>
        Effect.tryPromise({
          try: () =>
            signedXml.Sign(mappedAlgo, privateKey, xmlDoc, {
              id: 'Signature',
              x509: [x509Certificate],
              references: [
                {
                  uri: '',
                  hash: 'SHA-256',
                  transforms: ['enveloped', 'exc-c14n'],
                },
              ],
              signingCertificate: x509Certificate,
              signingTime: { value: new Date() },
            }),
          catch: (cause) =>
            new XMLSigningError({
              message: "Can't sign XML document (Sign failed)",
              cause,
            }),
        }),
      ),

      Effect.map(({ signedXml }) => [xmlDoc, signedXml] as SignedDocumentTuple),
    );
