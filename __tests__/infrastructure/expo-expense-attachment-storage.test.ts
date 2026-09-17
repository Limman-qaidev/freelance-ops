import { File } from 'expo-file-system';

const mockCopy = jest.fn();
const mockDelete = jest.fn();
const mockDirectoryCreate = jest.fn();
const mockPickFileAsync = jest.fn();

jest.mock('expo-file-system', () => {
  class MockDirectory {
    uri: string;
    exists = false;

    constructor(...parts: Array<{ uri?: string } | string>) {
      this.uri = parts
        .map((part) => (typeof part === 'string' ? part : (part.uri ?? '')))
        .join('/')
        .replace(/\/+/, '/');
      if (this.uri.startsWith('file:/')) this.uri = this.uri.replace('file:/', 'file:///');
    }

    create() {
      this.exists = true;
      mockDirectoryCreate(this.uri);
    }
  }

  class MockFile {
    static pickFileAsync = mockPickFileAsync;
    uri: string;
    name: string;
    type: string;
    size: number;
    md5: string | null;
    exists = true;

    constructor(...parts: Array<{ uri?: string } | string>) {
      const raw = parts
        .map((part) => (typeof part === 'string' ? part : (part.uri ?? '')))
        .join('/')
        .replace(/\/+/, '/');
      this.uri = raw.startsWith('file:/') ? raw.replace('file:/', 'file:///') : raw;
      this.name = this.uri.split('/').pop() || 'receipt.pdf';
      this.type = 'application/pdf';
      this.size = 321;
      this.md5 = 'md5:receipt';
    }

    copy(destination: MockFile) {
      mockCopy(this.uri, destination.uri);
    }

    delete() {
      this.exists = false;
      mockDelete(this.uri);
    }
  }

  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: { uri: 'file:///documents' } },
  };
});

function loadStorage() {
  return (
    jest.requireActual(
      '../../src/infrastructure/filesystem/expo-expense-attachment-storage',
    ) as {
      ExpoExpenseAttachmentStorage: new () => {
        pickAndStore(id: string): Promise<unknown>;
        exists(uri: string): Promise<boolean>;
        checksumFor(uri: string): Promise<string | null>;
        delete(uri: string): Promise<void>;
      };
    }
  ).ExpoExpenseAttachmentStorage;
}

describe('Expo expense attachment storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('copies a picked receipt into app-controlled document storage and returns durable metadata', async () => {
    const picked = new File('content://provider/Taxi Receipt.pdf');
    mockPickFileAsync.mockResolvedValue({ canceled: false, result: picked });
    const Storage = loadStorage();
    const storage = new Storage();

    const stored = await storage.pickAndStore('attachment-1');

    expect(mockDirectoryCreate).toHaveBeenCalled();
    expect(mockCopy).toHaveBeenCalledWith(
      'content://provider/Taxi Receipt.pdf',
      expect.stringContaining('expense-attachments/attachment-1-Taxi-Receipt.pdf'),
    );
    expect(stored).toEqual({
      localUri: expect.stringContaining('expense-attachments/attachment-1-Taxi-Receipt.pdf'),
      originalFilename: 'Taxi Receipt.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 321,
      checksum: 'md5:receipt',
    });
  });

  it('can detect, checksum and remove stored files', async () => {
    const Storage = loadStorage();
    const storage = new Storage();
    const uri = 'file:///documents/expense-attachments/attachment-1-receipt.pdf';

    await expect(storage.exists(uri)).resolves.toBe(true);
    await expect(storage.checksumFor(uri)).resolves.toBe('md5:receipt');
    await storage.delete(uri);

    expect(mockDelete).toHaveBeenCalledWith(uri);
  });
});
