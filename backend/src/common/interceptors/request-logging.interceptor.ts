import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { finalize, Observable } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    this.captureResponseBody(response);

    const requestSummary = {
      ip: request.ip,
      headers: this.redact(this.pickRequestHeaders(request.headers)),
      params: this.redact(request.params),
      query: this.redact(request.query),
      body: this.redact(request.body),
    };

    this.logger.log(
      `--> ${request.method} ${request.originalUrl ?? request.url} ${this.safeStringify(requestSummary)}`,
    );

    return next.handle().pipe(
      finalize(() => {
        const responseSummary = {
          statusCode: response.statusCode,
          body: this.redact(this.getCapturedResponseBody(response)),
        };

        this.logger.log(
          `<-- ${request.method} ${request.originalUrl ?? request.url} ${this.safeStringify(responseSummary)}`,
        );
        this.logger.log(
          `== ${request.method} ${request.originalUrl ?? request.url} ${response.statusCode} +${Date.now() - startedAt}ms`,
        );
      }),
    );
  }

  private captureResponseBody(response: Response): void {
    const target = response as Response & {
      __responseBodyCaptured?: boolean;
      __responseBody?: unknown;
    };

    if (target.__responseBodyCaptured) {
      return;
    }

    const originalJson = response.json.bind(response);
    const originalSend = response.send.bind(response);

    response.json = ((body: unknown) => {
      target.__responseBody = body;
      return originalJson(body);
    }) as Response['json'];

    response.send = ((body: unknown) => {
      if (target.__responseBody === undefined) {
        target.__responseBody = body;
      }
      return originalSend(body);
    }) as Response['send'];

    target.__responseBodyCaptured = true;
  }

  private getCapturedResponseBody(response: Response): unknown {
    return (response as Response & { __responseBody?: unknown }).__responseBody;
  }

  private pickRequestHeaders(headers: Request['headers']): Record<string, unknown> {
    return {
      host: headers.host,
      'user-agent': headers['user-agent'],
      'content-type': headers['content-type'],
      authorization: headers.authorization,
    };
  }

  private redact(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redact(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, item]) => [
          key,
          this.isSensitiveKey(key) ? '[REDACTED]' : this.redact(item),
        ]),
      );
    }

    return value;
  }

  private isSensitiveKey(key: string): boolean {
    const normalizedKey = key.toLowerCase();
    return [
      'password',
      'newpassword',
      'currentpassword',
      'passwordconfirmation',
      'password_confirmation',
      'token',
      'accesstoken',
      'refreshToken'.toLowerCase(),
      'authorization',
      'secret',
      'signature',
    ].includes(normalizedKey);
  }

  private safeStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return '"[Unserializable]"';
    }
  }
}
