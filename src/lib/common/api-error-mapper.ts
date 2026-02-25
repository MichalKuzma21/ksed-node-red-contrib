import {
  NetworkError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
  BadRequestError,
  TooManyRequestError,
  ApiExceptionDetail,
} from './errors';
import { Option } from 'effect/index';

type KsefApiBody =
  | {
      exceptionDetailList?: Array<ApiExceptionDetail>;
      referenceNumber?: string;
      serviceCode?: string;
      serviceCtx?: string;
      serviceName?: string;
      timestamp?: string;
    }
  | null
  | undefined;

type HttpErrorInput = {
  status: number;
  body: KsefApiBody;
  headers: Headers;
};

export const ksefApiErrorMapper = (apiName: string, response: HttpErrorInput) => {
  switch (response.status) {
    case 400:
      return new BadRequestError({
        apiName: apiName,
        apiError: {
          exceptionDetailList: response.body?.exceptionDetailList ?? [],
          referenceNumber: response.body?.referenceNumber,
          serviceCode: response.body?.serviceCode,
          serviceCtx: response.body?.serviceCtx,
          serviceName: response.body?.serviceName,
          timestamp: response.body?.timestamp,
          cause: response.body,
        },
      });

    case 401:
      return new UnauthorizedError({ apiName });

    case 403:
      return new ForbiddenError({ apiName });

    case 429: {
      const header = response.headers.get('Retry-After') ?? response.headers.get('retry-after');

      const retryAfter = Option.fromNullable(header).pipe(
        Option.flatMap((value) => {
          const parsed = parseInt(value, 10);
          return Number.isNaN(parsed) ? Option.none() : Option.some(parsed);
        }),
      );

      return new TooManyRequestError({ apiName: apiName, retryAfter: retryAfter });
    }

    case 500:
    case 502:
    case 503:
    case 504:
      return new InternalServerError({
        apiName,
        body: response.body,
      });

    default:
      return new NetworkError({ cause: response.body });
  }
};
