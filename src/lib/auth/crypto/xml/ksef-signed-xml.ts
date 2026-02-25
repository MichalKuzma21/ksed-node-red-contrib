import * as xadesjs from 'xadesjs';
import * as XmlCore from 'xml-core';

// Since xadesjs doesn't allow setting a custom Target/SignedProperties ID and
// the KSeF API requires specific values, I created a custom SignedXml class
// with a slightly modified CreateQualifyingProperties implementation.
export class KsefSignedXml extends xadesjs.SignedXml {
  CreateQualifyingProperties() {
    if (this.Properties) {
      throw new XmlCore.XmlError(
        XmlCore.XE.XML_EXCEPTION,
        'Cannot create QualifyingProperties cause current signature has got one. You must create CounterSignature',
      );
    }

    const dataObject = new xadesjs.xml.DataObject();
    dataObject.QualifyingProperties.Target = `#Signature`;
    dataObject.QualifyingProperties.SignedProperties.Id ||= `SignedProperties`;
    this.properties = dataObject.QualifyingProperties;
    this.XmlSignature.ObjectList.Add(dataObject);
  }
}
