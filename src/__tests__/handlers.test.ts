import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleWriteFileIso, handleEditFileIso, handleReadFileIso } from '../handlers.js';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import * as iconv from 'iconv-lite';

const TEST_ROOT = join(process.cwd(), `.mcp-iso8859-writer-handlers-${process.pid}`);
const TEST_DIR = join(TEST_ROOT, 'test-temp');
const originalBackupRoot = process.env.MCP_ISO_BACKUP_ROOT;

beforeEach(() => {
    process.env.MCP_ISO_BACKUP_ROOT = TEST_ROOT;
    if (!existsSync(TEST_DIR)) {
        mkdirSync(TEST_DIR, { recursive: true });
    }
});

afterEach(() => {
    if (originalBackupRoot === undefined) {
        delete process.env.MCP_ISO_BACKUP_ROOT;
    } else {
        process.env.MCP_ISO_BACKUP_ROOT = originalBackupRoot;
    }
    if (existsSync(TEST_ROOT)) {
        rmSync(TEST_ROOT, { recursive: true, force: true });
    }
});

describe('handleWriteFileIso', () => {
    let testFile: string;

    beforeEach(() => {
        testFile = join(TEST_DIR, `write-test-${Date.now()}.txt`);
    });

    it('should write UTF-8 content as ISO-8859-1', async () => {
        const content = 'Hello World';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.encoding).toBe('iso-8859-1');
        expect(result.structuredContent?.is_clean).toBe(true);
        expect(existsSync(testFile)).toBe(true);
    });

    it('should handle Latin-1 special characters', async () => {
        const content = 'Café, niño, Zürich, Ñoño';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.is_clean).toBe(true);
        expect(existsSync(testFile)).toBe(true);
    });

    it('should reject relative paths', async () => {
        const result = await handleWriteFileIso({ filePath: 'relative/path.txt', content: 'test' });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error');
    });

    it('should return verification info', async () => {
        const content = 'Test content';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent).toHaveProperty('success');
        expect(result.structuredContent).toHaveProperty('path');
        expect(result.structuredContent).toHaveProperty('encoding');
        expect(result.structuredContent).toHaveProperty('corruption_count');
        expect(result.structuredContent).toHaveProperty('is_clean');
    });
});

describe('handleReadFileIso', () => {
    let testFile: string;

    beforeEach(() => {
        testFile = join(TEST_DIR, `read-test-${Date.now()}.txt`);
    });

    it('should read ISO-8859-1 file as UTF-8', async () => {
        const content = 'Hello World';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleReadFileIso({ filePath: testFile });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.content).toBe(content);
    });

    it('should detect LF line endings', async () => {
        const content = 'line1\nline2\nline3';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleReadFileIso({ filePath: testFile });

        expect(result.structuredContent?.line_ending).toBe('LF');
        expect(result.structuredContent?.lines).toBe(3);
    });

    it('should detect CRLF line endings', async () => {
        const content = 'line1\r\nline2\r\nline3';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleReadFileIso({ filePath: testFile });

        expect(result.structuredContent?.line_ending).toBe('CRLF');
        expect(result.structuredContent?.lines).toBe(3);
    });

    it('should handle Latin-1 special characters', async () => {
        const content = 'Café, niño, Zürich';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleReadFileIso({ filePath: testFile });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.content).toBe(content);
    });

    it('should return error for non-existent file', async () => {
        const nonExistentFile = join(TEST_DIR, 'non-existent-file.txt');
        const result = await handleReadFileIso({ filePath: nonExistentFile });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error');
    });

    it('should reject relative paths', async () => {
        const result = await handleReadFileIso({ filePath: 'relative/path.txt' });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error');
    });
});

describe('handleEditFileIso', () => {
    let testFile: string;

    beforeEach(() => {
        testFile = join(TEST_DIR, `edit-test-${Date.now()}.txt`);
    });

    it('should edit lines preserving LF endings', async () => {
        const content = 'line1\nline2\nline3\nline4';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 2,
            endLine: 3,
            newContent: 'new line 2\nnew line 3'
        });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.lines_replaced).toBe(2);
        expect(result.structuredContent).toHaveProperty('backup_path');

        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toBe('line1\nnew line 2\nnew line 3\nline4');
        expect(readResult.structuredContent?.line_ending).toBe('LF');
    });

    it('should edit lines preserving CRLF endings', async () => {
        const content = 'line1\r\nline2\r\nline3';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 2,
            endLine: 2,
            newContent: 'modified line 2'
        });

        expect(result.structuredContent?.success).toBe(true);

        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toBe('line1\r\nmodified line 2\r\nline3');
        expect(readResult.structuredContent?.line_ending).toBe('CRLF');
    });

    it('should create backup before editing', async () => {
        const content = 'original content\nline 2';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 1,
            endLine: 1,
            newContent: 'modified content'
        });

        expect(result.structuredContent?.backup_path).toBeDefined();
        expect(existsSync(result.structuredContent!.backup_path)).toBe(true);
    });

    it('should handle Latin-1 special characters in edits', async () => {
        const content = 'line1\nline2\nline3';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 2,
            endLine: 2,
            newContent: 'Café, niño, Zürich'
        });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.is_clean).toBe(true);

        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toContain('Café, niño, Zürich');
    });

    it('should return error for non-existent file', async () => {
        const nonExistentFile = join(TEST_DIR, 'non-existent-file.txt');
        const result = await handleEditFileIso({
            filePath: nonExistentFile,
            startLine: 1,
            endLine: 1,
            newContent: 'test'
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error');
    });

    it('should return error for invalid line range', async () => {
        const content = 'line1\nline2\nline3';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 10,
            endLine: 20,
            newContent: 'test'
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error');
    });

    it('should replace single line', async () => {
        const content = 'line1\nline2\nline3';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 2,
            endLine: 2,
            newContent: 'REPLACED'
        });

        expect(result.structuredContent?.lines_replaced).toBe(1);
        expect(result.structuredContent?.total_lines).toBe(3);

        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toBe('line1\nREPLACED\nline3');
    });

    it('should replace multiple lines with single line', async () => {
        const content = 'line1\nline2\nline3\nline4';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 2,
            endLine: 3,
            newContent: 'SINGLE LINE'
        });

        expect(result.structuredContent?.lines_replaced).toBe(2);
        expect(result.structuredContent?.total_lines).toBe(3);

        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toBe('line1\nSINGLE LINE\nline4');
    });

    it('should reject relative paths', async () => {
        const result = await handleEditFileIso({
            filePath: 'relative/path.txt',
            startLine: 1,
            endLine: 1,
            newContent: 'test'
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error');
    });
});
