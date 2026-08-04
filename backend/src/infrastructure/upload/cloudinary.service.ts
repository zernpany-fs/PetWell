import { EnvVariable } from '@/config/env.validation';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'node:stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService<EnvVariable, true>) {
    cloudinary.config({
      cloud_name: configService.get('CLOUDINARY_CLOUD_NAME', { infer: true }),
      api_key: configService.get('CLOUDINARY_API_KEY', { infer: true }),
      api_secret: configService.get('CLOUDINARY_API_SECRET', { infer: true }),
    });
  }

  upload(file: Express.Multer.File): Promise<string> {
    if (!file?.buffer) {
      throw new BadRequestException('No file was uploaded');
    }

    return new Promise((resolve, reject) => {
      const writableStream = cloudinary.uploader.upload_stream(
        {
          // Normalise the format on upload. Phones shoot HEIC by default;
          // Cloudinary stores it happily, but the Next.js image optimiser uses
          // sharp, which cannot decode HEIC — the image then fails to render
          // while jpg/png uploads work, which looks like a random failure.
          format: 'jpg',
          // Cap the stored size. A 12 MP phone photo is far larger than any
          // view in the app needs, and this keeps the source image small
          // before the optimiser ever touches it.
          transformation: [
            { width: 1600, height: 1600, crop: 'limit' },
            { quality: 'auto:good' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(error);
            reject(new InternalServerErrorException('Upload failed'));
            return;
          }
          resolve(result.secure_url);
        },
      );

      Readable.from(file.buffer).pipe(writableStream);
    });
  }
}
