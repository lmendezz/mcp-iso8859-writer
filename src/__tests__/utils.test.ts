import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectLineEnding, createBackup, verifyEncoding } from '../utils.js';
import { writeFileSync, unlinkSync, existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import * as iconv from 'iconv-lite';
import { tmpdir } from 'os';
import { join, basename } from 'path';

describe('detectLineEnding', () => {
    it('should detect CRLF', () => {
        const content = 'line1\r\nline2\r\nline3';
        expect(detectLineEnding(content)).toBe('\r\n');
    });

    it('should detect LF', () => {
        const content = 'line1\nline2\nline3';
        expect(detectLineEnding(content)).toBe('\n');
    });

    it('should prefer CRLF when both exist', () => {
        const content = 'line1\r\nline2\nline3\r\n';
        expect(detectLineEnding(content)).toBe('\r\n');
    });

    it('should return system default when no line endings', () => {
        const content = 'single line';
        const result = detectLineEnding(content);
        expect(['\r\n', '\n']).toContain(result);
    });
});

describe('createBackup', () => {
    let testFile: string;
    let backupPath: string;
    let testRoot: string;
    const originalEnv = process.env.MCP_ISO_BACKUP_ROOT;

    beforeEach(() => {
        testRoot = join(tmpdir(), `backup-test-${Date.now()}`);
        mkdirSync(testRoot, { recursive: true });
        process.env.MCP_ISO_BACKUP_ROOT = testRoot;
        testFile = join(testRoot, `test-${Date.now()}.txt`);
        writeFileSync(testFile, 'test content');
    });

    afterEach(() => {
        if (originalEnv === undefined) {
            delete process.env.MCP_ISO_BACKUP_ROOT;
        } else {
            process.env.MCP_ISO_BACKUP_ROOT = originalEnv;
        }
        if (existsSync(testRoot)) {
            rmSync(testRoot, { recursive: true, force: true });
        }
    });

    it('should create backup with timestamp', () => {
        backupPath = createBackup(testFile);
        expect(existsSync(backupPath)).toBe(true);
        expect(backupPath).toContain('.backup.');
        expect(backupPath).toContain('.mcp-iso8859-writer');
    });

    it('should preserve file content', () => {
        backupPath = createBackup(testFile);
        const original = readFileSync(testFile, 'utf-8');
        const backup = readFileSync(backupPath, 'utf-8');
        expect(backup).toBe(original);
    });

    it('should correctly extract filename using basename (cross-platform)', () => {
        backupPath = createBackup(testFile);
        const expectedFileName = basename(testFile);
        expect(backupPath).toContain(expectedFileName);
    });

    it('should use MCP_ISO_BACKUP_ROOT for centralized backups', () => {
        backupPath = createBackup(testFile);
        expect(backupPath.startsWith(testRoot)).toBe(true);
        expect(backupPath).toContain(join(testRoot, '.mcp-iso8859-writer'));
    });

    it('should preserve directory structure within backup', () => {
        const subDir = join(testRoot, 'src', 'config');
        mkdirSync(subDir, { recursive: true });
        const nestedFile = join(subDir, 'settings.txt');
        writeFileSync(nestedFile, 'nested content');

        backupPath = createBackup(nestedFile);
        expect(backupPath).toContain(join('.mcp-iso8859-writer', 'src', 'config'));
    });

    it('should place external files in external directory', () => {
        const externalFile = join(tmpdir(), `external-${Date.now()}.txt`);
        writeFileSync(externalFile, 'external content');

        backupPath = createBackup(externalFile);
        expect(backupPath).toContain(join('.mcp-iso8859-writer', 'external'));

        unlinkSync(externalFile);
    });
});

describe('verifyEncoding', () => {
    let testFile: string;

    afterEach(() => {
        if (testFile && existsSync(testFile)) unlinkSync(testFile);
    });

    it('should report clean ISO-8859-1 file', () => {
        testFile = join(tmpdir(), `clean-${Date.now()}.txt`);
        const content = 'Hello World';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = verifyEncoding(testFile);
        expect(result.encoding).toBe('iso-8859-1');
        expect(result.corruptionCount).toBe(0);
        expect(result.isClean).toBe(true);
    });

    it('should verify encoding integrity', () => {
        testFile = join(tmpdir(), `verify-${Date.now()}.txt`);
        const content = 'Valid Latin-1: café';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = verifyEncoding(testFile);
        expect(result.encoding).toBe('iso-8859-1');
        expect(result.isClean).toBe(true);
    });
});
