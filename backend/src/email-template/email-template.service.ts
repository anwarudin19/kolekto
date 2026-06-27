import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EmailTemplateStatus, EmailTemplateType, Prisma } from '@prisma/client';
import * as Handlebars from 'handlebars';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  getDefaultEmailTemplate,
  getPreviewContext,
  getRequiredEmailTemplateVariables,
} from './email-template.constants';

export type EmailTemplateRecord = Prisma.EmailTemplateGetPayload<{
  select: {
    id: true;
    type: true;
    name: true;
    subject: true;
    htmlBody: true;
    textBody: true;
    status: true;
    version: true;
    isActive: true;
    requiredVariables: true;
    createdBy: true;
    updatedBy: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

export type RenderedEmailTemplate = {
  subject: string;
  htmlBody: string;
  textBody: string | null;
  templateId: string | null;
  templateVersion: number | null;
  type: EmailTemplateType;
  context: Record<string, unknown>;
  source: 'database' | 'fallback' | 'override';
  missingVariables: string[];
};

type TemplateOverride = {
  subject?: string;
  htmlBody?: string;
  textBody?: string | null;
};

@Injectable()
export class EmailTemplateService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplateService.name);
  private readonly memoryCache = new Map<string, { value: EmailTemplateRecord; expiresAt: number }>();
  private readonly cacheTtlSeconds = 45;
  private readonly cachePrefix = 'email-template:active:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultTemplates();
  }

  async list(type?: EmailTemplateType) {
    return this.prisma.emailTemplate.findMany({
      where: type ? { type } : undefined,
      orderBy: [
        { type: 'asc' },
        { version: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async findById(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template email tidak ditemukan');
    }
    return template;
  }

  async createDraft(
    input: {
      type: EmailTemplateType;
      name?: string;
      subject?: string;
      htmlBody?: string;
      textBody?: string | null;
    },
    actorId?: string,
  ) {
    const latest = await this.prisma.emailTemplate.findFirst({
      where: { type: input.type },
      orderBy: { version: 'desc' },
    });

    const base = latest ?? null;

    const fallback = getDefaultEmailTemplate(input.type);
    const version = (latest?.version ?? 0) + 1;
    const name = input.name?.trim() || `${fallback.name} v${version}`;
    const subject = input.subject ?? base?.subject ?? fallback.subject;
    const htmlBody = input.htmlBody ?? base?.htmlBody ?? fallback.htmlBody;
    const textBody = input.textBody !== undefined ? input.textBody : base?.textBody ?? fallback.textBody;

    this.assertTemplateSafety(subject, htmlBody, textBody);

    return this.prisma.emailTemplate.create({
      data: {
        type: input.type,
        name,
        subject,
        htmlBody,
        textBody,
        status: 'DRAFT',
        version,
        isActive: false,
        requiredVariables: getRequiredEmailTemplateVariables(input.type),
        createdBy: actorId ?? null,
        updatedBy: actorId ?? null,
      },
    });
  }

  async updateDraft(
    id: string,
    input: {
      name?: string;
      subject?: string;
      htmlBody?: string;
      textBody?: string | null;
    },
    actorId?: string,
  ) {
    const template = await this.findById(id);
    if (template.status === EmailTemplateStatus.PUBLISHED && template.isActive) {
      throw new BadRequestException('Template aktif tidak bisa diedit langsung. Buat draft baru terlebih dahulu.');
    }

    const next = {
      name: input.name ?? template.name,
      subject: input.subject ?? template.subject,
      htmlBody: input.htmlBody ?? template.htmlBody,
      textBody: input.textBody !== undefined ? input.textBody : template.textBody,
    };

    this.assertTemplateSafety(next.subject, next.htmlBody, next.textBody);
    this.assertRequiredVariables(template.type, next.subject, next.htmlBody, next.textBody);

    return this.prisma.emailTemplate.update({
      where: { id },
      data: {
        ...next,
        updatedBy: actorId ?? null,
      },
    });
  }

  async publish(id: string, actorId?: string) {
    const template = await this.findById(id);
    const required = getRequiredEmailTemplateVariables(template.type);
    this.assertTemplateSafety(template.subject, template.htmlBody, template.textBody);
    this.assertRequiredVariables(template.type, template.subject, template.htmlBody, template.textBody);

    return this.prisma.$transaction(async (tx) => {
      await tx.emailTemplate.updateMany({
        where: { type: template.type, isActive: true, id: { not: id } },
        data: {
          isActive: false,
          status: EmailTemplateStatus.ARCHIVED,
          updatedBy: actorId ?? null,
        },
      });

      const published = await tx.emailTemplate.update({
        where: { id },
        data: {
          status: EmailTemplateStatus.PUBLISHED,
          isActive: true,
          requiredVariables: required,
          updatedBy: actorId ?? null,
        },
      });

      await this.clearCache(template.type);
      return published;
    });
  }

  async rollback(id: string, actorId?: string) {
    const template = await this.findById(id);
    if (template.isActive && template.status === EmailTemplateStatus.PUBLISHED) {
      return template;
    }

    this.assertTemplateSafety(template.subject, template.htmlBody, template.textBody);
    this.assertRequiredVariables(template.type, template.subject, template.htmlBody, template.textBody);

    return this.prisma.$transaction(async (tx) => {
      await tx.emailTemplate.updateMany({
        where: { type: template.type, isActive: true, id: { not: id } },
        data: {
          isActive: false,
          status: EmailTemplateStatus.ARCHIVED,
          updatedBy: actorId ?? null,
        },
      });

      const restored = await tx.emailTemplate.update({
        where: { id },
        data: {
          isActive: true,
          status: EmailTemplateStatus.PUBLISHED,
          updatedBy: actorId ?? null,
        },
      });

      await this.clearCache(template.type);
      return restored;
    });
  }

  async preview(
    id: string,
    override?: TemplateOverride,
    context?: Record<string, unknown>,
  ) {
    const template = await this.findById(id);
    const rendered = await this.renderFromTemplate(
      template,
      context ?? getPreviewContext(template.type),
      override,
    );

    return {
      template,
      ...rendered,
    };
  }

  async resolveForType(type: EmailTemplateType) {
    const active = await this.getActiveTemplate(type);
    if (active) {
      return { template: active, source: 'database' as const };
    }

    return {
      template: null,
      fallback: getDefaultEmailTemplate(type),
      source: 'fallback' as const,
    };
  }

  async renderForType(type: EmailTemplateType, context: Record<string, unknown>) {
    const resolved = await this.resolveForType(type);

    if (resolved.template) {
      return this.renderFromTemplate(resolved.template, context);
    }

    return this.renderFromDefinition(
      type,
      resolved.fallback,
      context,
      null,
      null,
      'fallback',
    );
  }

  async renderById(
    id: string,
    context?: Record<string, unknown>,
    override?: TemplateOverride,
  ) {
    const template = await this.findById(id);
    return this.renderFromTemplate(
      template,
      context ?? getPreviewContext(template.type),
      override,
    );
  }

  async getActiveTemplate(type: EmailTemplateType) {
    const key = this.cacheKey(type);
    const cached = this.readMemoryCache(key) ?? await this.cacheService.get<EmailTemplateRecord>(key);
    if (cached) {
      this.writeMemoryCache(key, cached);
      return cached;
    }

    const template = await this.prisma.emailTemplate.findFirst({
      where: { type, isActive: true, status: EmailTemplateStatus.PUBLISHED },
      orderBy: { updatedAt: 'desc' },
    });

    if (template) {
      this.writeCache(type, template).catch(() => {});
    }

    return template;
  }

  async clearCache(type: EmailTemplateType) {
    const key = this.cacheKey(type);
    this.memoryCache.delete(key);
    await this.cacheService.del(key);
  }

  async ensureDefaultTemplates() {
    for (const type of Object.values(EmailTemplateType)) {
      const active = await this.prisma.emailTemplate.findFirst({
        where: { type, isActive: true, status: EmailTemplateStatus.PUBLISHED },
      });

      if (active) {
        continue;
      }

      const latest = await this.prisma.emailTemplate.findFirst({
        where: { type },
        orderBy: { version: 'desc' },
      });

      const fallback = getDefaultEmailTemplate(type);
      const version = (latest?.version ?? 0) + 1;

      try {
        await this.prisma.emailTemplate.create({
          data: {
            type,
            name: fallback.name,
            subject: fallback.subject,
            htmlBody: fallback.htmlBody,
            textBody: fallback.textBody,
            status: EmailTemplateStatus.PUBLISHED,
            version,
            isActive: true,
            requiredVariables: getRequiredEmailTemplateVariables(type),
            createdBy: null,
            updatedBy: null,
          },
        });
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }
      }

      await this.clearCache(type);
      this.logger.log(`Default email template ensured for ${type} v${version}`);
    }
  }

  private async writeCache(type: EmailTemplateType, template: EmailTemplateRecord) {
    const key = this.cacheKey(type);
    this.writeMemoryCache(key, template);
    await this.cacheService.set(key, template, this.cacheTtlSeconds);
  }

  private writeMemoryCache(key: string, value: EmailTemplateRecord) {
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + this.cacheTtlSeconds * 1000,
    });
  }

  private readMemoryCache(key: string): EmailTemplateRecord | null {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value;
  }

  private cacheKey(type: EmailTemplateType) {
    return `${this.cachePrefix}${type}`;
  }

  private async renderFromTemplate(
    template: EmailTemplateRecord,
    context: Record<string, unknown>,
    override?: TemplateOverride,
  ) {
    const subject = override?.subject ?? template.subject;
    const htmlBody = override?.htmlBody ?? template.htmlBody;
    const textBody = override?.textBody !== undefined ? override.textBody : template.textBody;

    this.assertTemplateSafety(subject, htmlBody, textBody);

    return this.renderFromDefinition(
      template.type,
      {
        subject,
        htmlBody,
        textBody: textBody ?? '',
      },
      context,
      template.id,
      template.version,
      override ? 'override' : 'database',
    );
  }

  private renderFromDefinition(
    type: EmailTemplateType,
    definition: { subject: string; htmlBody: string; textBody: string },
    context: Record<string, unknown>,
    templateId: string | null,
    templateVersion: number | null,
    source: 'database' | 'fallback' | 'override',
  ): RenderedEmailTemplate {
    const compiledContext = { ...context };
    const subject = this.renderTemplateString(definition.subject, compiledContext);
    const htmlBody = this.renderTemplateString(definition.htmlBody, compiledContext);
    const textBody = definition.textBody?.trim().length
      ? this.renderTemplateString(definition.textBody, compiledContext)
      : null;

    return {
      subject,
      htmlBody,
      textBody,
      templateId,
      templateVersion,
      type,
      context: compiledContext,
      source,
      missingVariables: this.findMissingVariables(
        type,
        definition.subject,
        definition.htmlBody,
        definition.textBody ?? '',
      ),
    };
  }

  private renderTemplateString(template: string, context: Record<string, unknown>) {
    const compiled = Handlebars.compile(template, {
      strict: false,
      noEscape: false,
    });
    return compiled(context);
  }

  private assertTemplateSafety(subject: string, htmlBody: string, textBody?: string | null) {
    const blocks = [subject, htmlBody, textBody ?? ''];
    for (const block of blocks) {
      if (/<script[\s>]/i.test(block)) {
        throw new BadRequestException('Template email tidak boleh mengandung script tag');
      }

      const invalid = this.findUnsafeHandlebarsTokens(block);
      if (invalid.length) {
        throw new BadRequestException(`Template mengandung syntax Handlebars yang tidak diizinkan: ${invalid[0]}`);
      }
    }
  }

  private assertRequiredVariables(
    type: EmailTemplateType,
    subject: string,
    htmlBody: string,
    textBody?: string | null,
  ) {
    const missing = this.findMissingVariables(type, subject, htmlBody, textBody ?? '');
    if (missing.length) {
      throw new BadRequestException(`Publish gagal. Variable wajib berikut belum dipakai: ${missing.join(', ')}`);
    }
  }

  private findMissingVariables(
    type: EmailTemplateType,
    subject: string,
    htmlBody: string,
    textBody: string,
  ) {
    const required = getRequiredEmailTemplateVariables(type);
    const used = new Set([
      ...this.extractVariables(subject),
      ...this.extractVariables(htmlBody),
      ...this.extractVariables(textBody),
    ]);
    return required.filter((variable) => !used.has(variable));
  }

  private extractVariables(template: string) {
    const matches = template.match(/{{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*}}/g) ?? [];
    return matches.map((match) => match.replace(/^{{\s*/, '').replace(/\s*}}$/, '').trim());
  }

  private findUnsafeHandlebarsTokens(template: string) {
    const matches = template.match(/{{{[^}]+}}}|{{[^}]+}}/g) ?? [];
    return matches.filter((token) => {
      if (token.startsWith('{{{')) {
        return true;
      }

      const inner = token.slice(2, -2).trim();
      return !/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(inner);
    });
  }

  private isUniqueConstraintError(error: unknown) {
    return typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: string }).code === 'P2002';
  }
}
