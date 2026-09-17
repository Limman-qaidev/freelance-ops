import { Directory, File, Paths } from 'expo-file-system';

import type {
  ExpenseAttachmentStorage,
  StoredExpenseAttachment,
} from '@/domain/expenses/expense';

const RECEIPT_DIRECTORY = 'expense-attachments';

export class ExpoExpenseAttachmentStorage implements ExpenseAttachmentStorage {
  async pickAndStore(attachmentId: string): Promise<StoredExpenseAttachment | null> {
    const picked = await File.pickFileAsync({
      multipleFiles: false,
      mimeTypes: ['image/*', 'application/pdf', 'text/plain'],
    });
    if (picked.canceled) return null;

    const source = picked.result;
    const directory = new Directory(Paths.document, RECEIPT_DIRECTORY);
    if (!directory.exists) {
      directory.create({ intermediates: true });
    }

    const originalFilename = source.name || 'receipt';
    const destination = new File(
      directory,
      `${attachmentId}-${sanitizeFilename(originalFilename)}`,
    );
    source.copy(destination);

    return {
      localUri: destination.uri,
      originalFilename,
      mimeType: destination.type || source.type || 'application/octet-stream',
      fileSizeBytes: destination.exists ? destination.size : null,
      checksum: destination.exists ? destination.md5 : null,
    };
  }

  async exists(localUri: string): Promise<boolean> {
    return new File(localUri).exists;
  }

  async checksumFor(localUri: string): Promise<string | null> {
    const file = new File(localUri);
    return file.exists ? file.md5 : null;
  }

  async delete(localUri: string): Promise<void> {
    const file = new File(localUri);
    if (file.exists) file.delete();
  }
}

function sanitizeFilename(filename: string): string {
  const sanitized = filename
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return sanitized || 'receipt';
}
