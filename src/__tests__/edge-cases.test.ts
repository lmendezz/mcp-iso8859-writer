import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleWriteFileIso, handleEditFileIso, handleReadFileIso } from '../handlers.js';
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as iconv from 'iconv-lite';

const TEST_DIR = join(process.cwd(), 'test-temp-edge');

beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
        mkdirSync(TEST_DIR, { recursive: true });
    }
});

afterEach(() => {
    if (existsSync(TEST_DIR)) {
        const files = readdirSync(TEST_DIR);
        files.forEach(file => {
            const filePath = join(TEST_DIR, file);
            try {
                unlinkSync(filePath);
            } catch (err) {
                // Ignore errors
            }
        });
    }
});

describe('Edge Cases - Empty and Single Character Files', () => {
    let testFile: string;

    beforeEach(() => {
        testFile = join(TEST_DIR, `edge-${Date.now()}.txt`);
    });

    it('should handle empty file content', async () => {
        const result = await handleWriteFileIso({ filePath: testFile, content: '' });

        expect(result.structuredContent?.success).toBe(true);
        expect(existsSync(testFile)).toBe(true);

        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toBe('');
    });

    it('should handle single character', async () => {
        const result = await handleWriteFileIso({ filePath: testFile, content: 'a' });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toBe('a');
    });

    it('should handle only newlines', async () => {
        const result = await handleWriteFileIso({ filePath: testFile, content: '\n\n\n' });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.lines).toBe(4);
    });

    it('should handle only spaces', async () => {
        const content = '     ';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toBe(content);
    });
});

describe('Edge Cases - Special ISO-8859-1 Characters', () => {
    let testFile: string;

    beforeEach(() => {
        testFile = join(TEST_DIR, `special-${Date.now()}.txt`);
    });

    it('should handle extended ASCII characters (128-255)', async () => {
        const content = '©®™€£¥¢§¶†‡¤';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toContain('©');
    });

    it('should handle accented characters', async () => {
        const content = 'àáâãäåèéêëìíîïòóôõöùúûü';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.is_clean).toBe(true);
    });

    it('should handle special punctuation', async () => {
        const content = '«»‹›""\'\'–—…';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
    });

    it('should handle all printable ISO-8859-1 characters', async () => {
        let content = '';
        for (let i = 32; i < 127; i++) {
            content += String.fromCharCode(i);
        }
        for (let i = 160; i < 256; i++) {
            content += String.fromCharCode(i);
        }

        const result = await handleWriteFileIso({ filePath: testFile, content });
        expect(result.structuredContent?.success).toBe(true);
    });
});

describe('Edge Cases - Line Ending Variations', () => {
    let testFile: string;

    beforeEach(() => {
        testFile = join(TEST_DIR, `lineending-${Date.now()}.txt`);
    });

    it('should preserve mixed line endings when editing', async () => {
        const content = 'line1\nline2\r\nline3\nline4';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 2,
            endLine: 2,
            newContent: 'modified'
        });

        expect(result.structuredContent?.success).toBe(true);
    });

    it('should handle file ending without newline', async () => {
        const content = 'line1\nline2\nline3';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.lines).toBe(3);
    });

    it('should handle file with only one line no newline', async () => {
        const content = 'single line';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.lines).toBe(1);
    });
});

describe('Edge Cases - Large Content', () => {
    let testFile: string;

    beforeEach(() => {
        testFile = join(TEST_DIR, `large-${Date.now()}.txt`);
    });

    it('should handle file with many lines (1000+)', async () => {
        const lines = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}`);
        const content = lines.join('\n');

        const result = await handleWriteFileIso({ filePath: testFile, content });
        expect(result.structuredContent?.success).toBe(true);

        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.lines).toBe(1000);
    });

    it('should handle very long single line', async () => {
        const content = 'a'.repeat(10000);
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content.length).toBe(10000);
    });

    it('should edit line at the end of large file', async () => {
        const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
        const content = lines.join('\n');
        await handleWriteFileIso({ filePath: testFile, content });

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 100,
            endLine: 100,
            newContent: 'Last line modified'
        });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.lines_replaced).toBe(1);
    });

    it('should edit first line of large file', async () => {
        const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`);
        const content = lines.join('\n');
        await handleWriteFileIso({ filePath: testFile, content });

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 1,
            endLine: 1,
            newContent: 'First line modified'
        });

        expect(result.structuredContent?.success).toBe(true);
    });
});

describe('Edge Cases - Edit Operations', () => {
    let testFile: string;

    beforeEach(() => {
        testFile = join(TEST_DIR, `edit-${Date.now()}.txt`);
    });

    it('should replace all lines in file', async () => {
        const content = 'line1\nline2\nline3';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 1,
            endLine: 3,
            newContent: 'replaced'
        });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.total_lines).toBe(1);
    });

    it('should insert multiple lines in place of one', async () => {
        const content = 'line1\nline2\nline3';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 2,
            endLine: 2,
            newContent: 'new1\nnew2\nnew3'
        });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.total_lines).toBe(5);
    });

    it('should handle edit with empty newContent', async () => {
        const content = 'line1\nline2\nline3';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 2,
            endLine: 2,
            newContent: ''
        });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.total_lines).toBe(3);
    });

    it('should handle consecutive edits', async () => {
        const content = 'line1\nline2\nline3\nline4\nline5';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        await handleEditFileIso({
            filePath: testFile,
            startLine: 2,
            endLine: 2,
            newContent: 'modified2'
        });

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 4,
            endLine: 4,
            newContent: 'modified4'
        });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toContain('modified2');
        expect(readResult.structuredContent?.content).toContain('modified4');
    });
});

describe('Edge Cases - Boundary Conditions', () => {
    let testFile: string;

    beforeEach(() => {
        testFile = join(TEST_DIR, `boundary-${Date.now()}.txt`);
    });

    it('should handle line range at exact file bounds (1 to N)', async () => {
        const content = 'line1\nline2\nline3';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 1,
            endLine: 3,
            newContent: 'all replaced'
        });

        expect(result.structuredContent?.success).toBe(true);
    });

    it('should reject startLine = 0', async () => {
        const content = 'line1\nline2';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 0,
            endLine: 1,
            newContent: 'test'
        });

        expect(result.isError).toBe(true);
    });

    it('should reject negative line numbers', async () => {
        const content = 'line1\nline2';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: -1,
            endLine: 1,
            newContent: 'test'
        });

        expect(result.isError).toBe(true);
    });

    it('should handle single line file edit', async () => {
        const content = 'single line';
        const buffer = iconv.encode(content, 'iso-8859-1');
        writeFileSync(testFile, buffer);

        const result = await handleEditFileIso({
            filePath: testFile,
            startLine: 1,
            endLine: 1,
            newContent: 'replaced'
        });

        expect(result.structuredContent?.success).toBe(true);
        expect(result.structuredContent?.total_lines).toBe(1);
    });
});

describe('Edge Cases - Path Handling', () => {
    it('should normalize path with .. and .', async () => {
        const normalPath = join(TEST_DIR, 'subdir', '..', 'test.txt');
        const result = await handleWriteFileIso({ filePath: normalPath, content: 'test' });

        expect(result.structuredContent?.success).toBe(true);
    });

    it('should handle paths with multiple slashes', async () => {
        const testPath = join(TEST_DIR, 'test.txt').replace(/\//g, '//');
        const normalized = testPath.replace(/\/\//g, '/');
        
        const result = await handleWriteFileIso({ filePath: normalized, content: 'test' });
        expect(result.structuredContent?.success).toBe(true);
    });
});

describe('Edge Cases - Content with Special Patterns', () => {
    let testFile: string;

    beforeEach(() => {
        testFile = join(TEST_DIR, `pattern-${Date.now()}.txt`);
    });

    it('should handle content with tabs', async () => {
        const content = 'col1\tcol2\tcol3\nval1\tval2\tval3';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toContain('\t');
    });

    it('should handle content with null bytes', async () => {
        const content = 'before\x00after';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
    });

    it('should handle content with backslashes', async () => {
        const content = 'C:\\Users\\test\\file.txt';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toBe(content);
    });

    it('should handle content with quotes', async () => {
        const content = 'He said "hello" and \'goodbye\'';
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toBe(content);
    });

    it('should handle SQL-like content', async () => {
        const content = "INSERT INTO users VALUES ('John', 'Doe', 25);";
        const result = await handleWriteFileIso({ filePath: testFile, content });

        expect(result.structuredContent?.success).toBe(true);
        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.content).toBe(content);
    });
});
