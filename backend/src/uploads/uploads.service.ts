import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { buildStorageKey } from 'src/common/utils/file';

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly client: Client;
  private readonly signingClient: Client;
  private readonly bucket: string;
  private readonly maxSizeBytes: number;
  private readonly allowedMimeTypes: string[];

  constructor(private readonly configService: ConfigService) {
    const accessKey = this.configService.getOrThrow<string>('minio.accessKey');
    const secretKey = this.configService.getOrThrow<string>('minio.secretKey');
    const region = this.configService.get<string>('minio.region', 'us-east-1');
    const internalUseSSL = this.configService.get<boolean>('minio.useSSL', false);
    const internalPort = this.configService.get<number>('minio.port', 9000);
    const internalEndPoint = this.configService.getOrThrow<string>('minio.endPoint');
    this.client = new Client({
      endPoint: internalEndPoint,
      port: internalPort,
      useSSL: internalUseSSL,
      region,
      accessKey,
      secretKey,
    });
    this.signingClient = this.buildSigningClient(
      this.configService.get<string>('minio.publicUrl'),
      region,
      accessKey,
      secretKey,
      internalEndPoint,
      internalPort,
      internalUseSSL,
    );
    this.bucket = this.configService.getOrThrow<string>('minio.bucket');
    this.maxSizeBytes = this.configService.get<number>('upload.maxSizeMb', 5) * 1024 * 1024;
    this.allowedMimeTypes = this.configService.get<string[]>('upload.allowedMimeTypes', []);
  }

  async onModuleInit(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async uploadPaymentProof(file: Express.Multer.File, teamId: string) {
    return this.uploadFile(file, teamId, 'payments');
  }

  async uploadExpenseProof(file: Express.Multer.File, teamId: string) {
    return this.uploadFile(file, teamId, 'expenses');
  }

  async getSignedUrl(storageKey: string): Promise<string> {
    return this.signingClient.presignedGetObject(this.bucket, storageKey, 60 * 15);
  }

  async deleteFile(storageKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, storageKey);
  }

  private async uploadFile(
    file: Express.Multer.File,
    teamId: string,
    type: 'payments' | 'expenses',
  ) {
    this.validateFile(file);
    const storageKey = buildStorageKey(type, teamId, file.originalname);

    try {
      await this.client.putObject(this.bucket, storageKey, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });
    } catch (error) {
      throw new InternalServerErrorException('Gagal mengunggah file ke penyimpanan objek');
    }

    return {
      storageKey,
      proofUrl: null,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('File wajib diunggah');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Tipe file tidak didukung');
    }

    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException('Ukuran file melebihi batas maksimum');
    }
  }

  private buildSigningClient(
    publicUrl: string | undefined,
    region: string,
    accessKey: string,
    secretKey: string,
    fallbackEndPoint: string,
    fallbackPort: number,
    fallbackUseSSL: boolean,
  ): Client {
    if (!publicUrl) {
      return new Client({
        endPoint: fallbackEndPoint,
        port: fallbackPort,
        useSSL: fallbackUseSSL,
        region,
        accessKey,
        secretKey,
      });
    }

    try {
      const parsed = new URL(publicUrl);
      return new Client({
        endPoint: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80,
        useSSL: parsed.protocol === 'https:',
        region,
        accessKey,
        secretKey,
      });
    } catch {
      return new Client({
        endPoint: fallbackEndPoint,
        port: fallbackPort,
        useSSL: fallbackUseSSL,
        region,
        accessKey,
        secretKey,
      });
    }
  }
}
