import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectLineEnding, createBackup, verifyEncoding } from '../utils.js';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import * as iconv from 'iconv-lite';
import { tmpdir } from 'os';
import { join } from 'path';

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

    beforeEach(() => {
        testFile = join(tmpdir(), `test-${Date.now()}.txt`);
        writeFileSync(testFile, 'test content');
    });

    afterEach(() => {
        if (existsSync(testFile)) unlinkSync(testFile);
        if (backupPath && existsSync(backupPath)) unlinkSync(backupPath);
    });

    it('should create backup with timestamp', () => {
        backupPath = createBackup(testFile);
        expect(existsSync(backupPath)).toBe(true);
        expect(backupPath).toContain('.backup.');
    });

    it('should preserve file content', () => {
        backupPath = createBackup(testFile);
        const original = readFileSync(testFile, 'utf-8');
        const backup = readFileSync(backupPath, 'utf-8');
        expect(backup).toBe(original);
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
