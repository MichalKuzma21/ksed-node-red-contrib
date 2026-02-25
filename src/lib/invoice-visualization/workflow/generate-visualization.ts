import { Effect } from 'effect/index';
import {
  InvoiceGenerationInput,
  invoiceGenerator,
} from '../../../nodes/invoice-visualization/invoice-generator-adapter';
import { PDFGenerationError } from '../errors';

export const generateVisualizationWorkflow = (params: InvoiceGenerationInput) => {
  return Effect.Do.pipe(
    Effect.tap(() => Effect.logInfo('Generating invoice visualization')),
    Effect.bind('invoicePdf', () =>
      Effect.tryPromise({
        try: () => invoiceGenerator.generateInvoice(params),
        catch: (err) => {
          return new PDFGenerationError({
            cause: err,
            message: `PDF generation failed`,
          });
        },
      }),
    ),
    Effect.tap(() => Effect.logInfo('Invoice visualization generated successfully')),
    Effect.map(({ invoicePdf }) => invoicePdf),
  );
};
