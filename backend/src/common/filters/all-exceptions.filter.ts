import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { formatWibTimestamp } from '../utils/timezone';

type NormalizedErrorResponse = {
  message: string;
  error: string;
  details?: Record<string, unknown>;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  private readonly errorLabelMap: Record<string, string> = {
    'Bad Request': 'Permintaan Tidak Valid',
    Unauthorized: 'Tidak Diizinkan',
    Forbidden: 'Dilarang',
    'Not Found': 'Tidak Ditemukan',
    Conflict: 'Konflik',
    'Internal Server Error': 'Kesalahan Server Internal',
    BadRequestException: 'Permintaan Tidak Valid',
    UnauthorizedException: 'Tidak Diizinkan',
    ForbiddenException: 'Dilarang',
    NotFoundException: 'Tidak Ditemukan',
    ConflictException: 'Konflik',
    InternalServerErrorException: 'Kesalahan Server Internal',
  };

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = this.normalizeErrorResponse(exception);

    if (status >= 500) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: formatWibTimestamp(),
      path: request.url,
      message: errorResponse.message,
      error: errorResponse.error,
      details: errorResponse.details,
    });
  }

  private normalizeErrorResponse(exception: unknown): NormalizedErrorResponse {
    if (!(exception instanceof HttpException)) {
      return {
        message: 'Kesalahan server internal',
        error: 'Kesalahan Server Internal',
      };
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        message: response,
        error: exception.name,
      };
    }

    if (response && typeof response === 'object') {
      const payload = response as Record<string, unknown>;
      const { statusCode: _statusCode, message, error, ...details } = payload;

      return {
        message: this.normalizeMessage(message, exception.message),
        error: this.normalizeErrorLabel(typeof error === 'string' ? error : exception.name),
        details: Object.keys(details).length > 0 ? details : undefined,
      };
    }

    return {
      message: exception.message,
      error: this.normalizeErrorLabel(exception.name),
    };
  }

  private normalizeErrorLabel(error: string): string {
    return this.errorLabelMap[error] ?? error;
  }

  private normalizeMessage(
    message: unknown,
    fallback: string,
  ): string {
    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message)) {
      return message
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .join(', ');
    }

    if (message && typeof message === 'object') {
      try {
        return JSON.stringify(message);
      } catch {
        return fallback;
      }
    }

    return fallback;
  }
}
