import { describe, it, expect } from 'vitest';
import { Effect, Exit } from 'effect';
import { generateVisualizationWorkflow } from '../../../../../src/lib/invoice-visualization/workflow/generate-visualization';
import { PDFGenerationError } from '../../../../../src/lib/invoice-visualization/errors';

const FA3_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns:etd="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns="http://crd.gov.pl/wzor/2025/06/25/13775/">
  <Naglowek>
    <KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza>
    <WariantFormularza>3</WariantFormularza>
    <DataWytworzeniaFa>2026-04-27</DataWytworzeniaFa>
    <SystemInfo>SamploFaktur</SystemInfo>
  </Naglowek>
  <Podmiot1>
    <DaneIdentyfikacyjne>
      <NIP>1234567890</NIP>
      <Nazwa>ABC AGD sp. z o. o.</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <KodKraju>PL</KodKraju>
      <AdresL1>ul. Kwiatowa 1 m. 2</AdresL1>
      <AdresL2>00-001 Warszawa</AdresL2>
    </Adres>
    <DaneKontaktowe>
      <Email>abc@abc.pl</Email>
      <Telefon>667444555</Telefon>
    </DaneKontaktowe>
  </Podmiot1>
  <Podmiot2>
    <DaneIdentyfikacyjne>
      <NIP>8976999999</NIP>
      <Nazwa>F.H.U. Jan Kowalski</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <KodKraju>PL</KodKraju>
      <AdresL1>ul. Polna 1</AdresL1>
      <AdresL2>00-001 Warszawa</AdresL2>
    </Adres>
    <DaneKontaktowe>
      <Email>jan@kowalski.pl</Email>
      <Telefon>555777999</Telefon>
    </DaneKontaktowe>
    <NrKlienta>fdfd778343</NrKlienta>
    <JST>2</JST>
    <GV>2</GV>
  </Podmiot2>
  <Fa>
    <KodWaluty>PLN</KodWaluty>
    <P_1>2026-04-27</P_1>
    <P_1M>Warszawa</P_1M>
    <P_2>FV/2026/04/001</P_2>
    <P_6>2026-04-27</P_6>
    <P_13_1>8976111986</P_13_1>
    <P_14_1>383.33</P_14_1>
    <P_13_3>0.95</P_13_3>
    <P_14_3>0.05</P_14_3>
    <P_15>2051</P_15>
    <Adnotacje>
      <P_16>2</P_16>
      <P_17>2</P_17>
      <P_18>2</P_18>
      <P_18A>2</P_18A>
      <Zwolnienie>
        <P_19N>1</P_19N>
      </Zwolnienie>
      <NoweSrodkiTransportu>
        <P_22N>1</P_22N>
      </NoweSrodkiTransportu>
      <P_23>2</P_23>
      <PMarzy>
        <P_PMarzyN>1</P_PMarzyN>
      </PMarzy>
    </Adnotacje>
    <RodzajFaktury>VAT</RodzajFaktury>
    <FP>1</FP>
    <FaWiersz>
      <NrWierszaFa>1</NrWierszaFa>
      <UU_ID>aaaa111133339990</UU_ID>
      <P_7>lodówka Zimnotech mk1</P_7>
      <P_8A>szt.</P_8A>
      <P_8B>1</P_8B>
      <P_9A>1626.01</P_9A>
      <P_11>1626.01</P_11>
      <P_12>23</P_12>
    </FaWiersz>
    <Platnosc>
      <Zaplacono>1</Zaplacono>
      <DataZaplaty>2026-04-27</DataZaplaty>
      <FormaPlatnosci>6</FormaPlatnosci>
    </Platnosc>
  </Fa>
  <Stopka>
    <Informacje>
      <StopkaFaktury>Kapital zakladowy 5 000 000</StopkaFaktury>
    </Informacje>
    <Rejestry>
      <KRS>0000099999</KRS>
      <REGON>999999999</REGON>
      <BDO>000099999</BDO>
    </Rejestry>
  </Stopka>
</Faktura>`;

const VALID_PARAMS = {
  xmlContent: FA3_XML,
  ksefNumber: 'PL1234567890-20260427-ABC123-FA',
  qrCodeURL: 'https://ksef-test.mf.gov.pl/verify/PL1234567890-20260427-ABC123-FA',
  isMobile: false,
};

describe('generateVisualizationWorkflow', () => {
  it('produces a non-empty base64 PDF string for a valid FA(3) invoice', async () => {
    const result = await Effect.runPromise(generateVisualizationWorkflow(VALID_PARAMS));

    expect(typeof result).toBe('string');
    expect((result as string).length).toBeGreaterThan(0);
    const decoded = Buffer.from(result as string, 'base64');
    expect(decoded.subarray(0, 4).toString()).toBe('%PDF');
  }, 15_000);

  it('fails with PDFGenerationError when XML is empty', async () => {
    const exit = await Effect.runPromiseExit(
      generateVisualizationWorkflow({ ...VALID_PARAMS, xmlContent: '' }),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PDFGenerationError);
    }
  });

  it('fails with PDFGenerationError when XML has unsupported FA version', async () => {
    const badXml = FA3_XML.replace('FA (3)', 'FA (99)');
    const exit = await Effect.runPromiseExit(
      generateVisualizationWorkflow({ ...VALID_PARAMS, xmlContent: badXml }),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PDFGenerationError);
    }
  });
});
