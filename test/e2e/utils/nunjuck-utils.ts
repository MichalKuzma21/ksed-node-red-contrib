import nunjucks from 'nunjucks';
import { Effect } from 'effect';

nunjucks.configure({ autoescape: true });

export const renderInvoice = (template: string, data: Record<string, any>) =>
  Effect.sync(() => nunjucks.renderString(template, data));

/**
 * Generates invoice template data based on Date.now()
 * Usefull when you want to send invoice in online mode
 */
export const invoiceDataDateNow = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomLongNumber = Math.floor(Math.random() * 1000);

  const issueDateFormatted = now.toISOString().split('.')[0] + 'Z';

  return {
    issueDate: issueDateFormatted,
    invoiceDate: `${year}-${month}-${day}`,
    invoiceNumber: `FV${year}/${month}/${randomLongNumber}`,
    timestamp: now.getTime(),
  };
};
