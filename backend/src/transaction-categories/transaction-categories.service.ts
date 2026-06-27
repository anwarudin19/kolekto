import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TeamsService } from 'src/teams/teams.service';
import { CreateTransactionCategoryDto } from './dto/create-transaction-category.dto';
import { UpdateTransactionCategoryDto } from './dto/update-transaction-category.dto';

@Injectable()
export class TransactionCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamsService: TeamsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async list(teamId: string, actorId: string) {
    await this.teamsService.ensureActiveMembership(teamId, actorId);
    return this.prisma.transactionCategory.findMany({
      where: { teamId },
      orderBy: { name: 'asc' },
    });
  }

  async create(teamId: string, actorId: string, dto: CreateTransactionCategoryDto) {
    await this.ensureAdminPrivileges(teamId, actorId);

    const existing = await this.prisma.transactionCategory.findUnique({
      where: { teamId_name: { teamId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(`Kategori "${dto.name}" sudah ada`);
    }

    const category = await this.prisma.transactionCategory.create({
      data: { teamId, ...dto },
    });

    await this.auditLogsService.create({
      teamId,
      userId: actorId,
      action: 'TRANSACTION_CATEGORY_CREATED',
      entityType: 'TransactionCategory',
      entityId: category.id,
      description: `Kategori transaksi "${category.name}" dibuat`,
      metadata: { name: category.name, type: category.type },
    });

    return category;
  }

  async update(teamId: string, categoryId: string, actorId: string, dto: UpdateTransactionCategoryDto) {
    await this.ensureAdminPrivileges(teamId, actorId);
    const category = await this.findOneInTeam(teamId, categoryId);

    if (dto.name && dto.name !== category.name) {
      const conflict = await this.prisma.transactionCategory.findUnique({
        where: { teamId_name: { teamId, name: dto.name } },
      });
      if (conflict) {
        throw new ConflictException(`Kategori "${dto.name}" sudah ada`);
      }
    }

    const updated = await this.prisma.transactionCategory.update({
      where: { id: categoryId },
      data: dto as any,
    });

    await this.auditLogsService.create({
      teamId,
      userId: actorId,
      action: 'TRANSACTION_CATEGORY_UPDATED',
      entityType: 'TransactionCategory',
      entityId: updated.id,
      description: `Kategori transaksi "${updated.name}" diperbarui`,
      metadata: JSON.parse(JSON.stringify(dto)),
    });

    return updated;
  }

  async delete(teamId: string, categoryId: string, actorId: string) {
    await this.ensureAdminPrivileges(teamId, actorId);
    const category = await this.findOneInTeam(teamId, categoryId);

    const usageCount = await this.prisma.transaction.count({
      where: { teamId, categoryId },
    });
    if (usageCount > 0) {
      throw new ConflictException(
        `Kategori masih dipakai oleh ${usageCount} transaksi`,
      );
    }

    await this.prisma.transactionCategory.delete({ where: { id: categoryId } });

    await this.auditLogsService.create({
      teamId,
      userId: actorId,
      action: 'TRANSACTION_CATEGORY_DELETED',
      entityType: 'TransactionCategory',
      entityId: category.id,
      description: `Kategori transaksi "${category.name}" dihapus`,
      metadata: { id: category.id, name: category.name },
    });

    return category;
  }

  async assertCategoryBelongsToTeam(teamId: string, categoryId: string) {
    return this.findOneInTeam(teamId, categoryId);
  }

  private async findOneInTeam(teamId: string, categoryId: string) {
    const category = await this.prisma.transactionCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category || category.teamId !== teamId) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }
    return category;
  }

  private async ensureAdminPrivileges(teamId: string, actorId: string) {
    const membership = await this.teamsService.ensureActiveMembership(teamId, actorId);
    const allowed: SystemRole[] = [SystemRole.OWNER, SystemRole.ADMIN];
    if (!allowed.includes(membership.systemRole)) {
      throw new ForbiddenException('Hanya owner atau admin yang dapat mengelola kategori');
    }
  }
}
