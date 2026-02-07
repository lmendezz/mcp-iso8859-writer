import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleWriteFileIso, handleEditFileIso, handleReadFileIso } from '../handlers.js';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_ROOT = join(process.cwd(), `.mcp-iso8859-writer-large-${process.pid}`);
const TEST_DIR = join(TEST_ROOT, 'test-temp-large');
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

describe('Large File Precision Tests - 100k Lines', () => {
    let testFile: string;

    beforeEach(() => {
        testFile = join(TEST_DIR, `large-${Date.now()}.txt`);
    });

    it('should create and verify 100k line file', async () => {
        const lines = Array.from({ length: 100000 }, (_, i) => `Line ${i + 1}: ${Math.random().toString(36).substring(7)}`);
        const content = lines.join('\n');

        const writeResult = await handleWriteFileIso({ filePath: testFile, content });
        expect(writeResult.structuredContent?.success).toBe(true);

        const readResult = await handleReadFileIso({ filePath: testFile });
        expect(readResult.structuredContent?.lines).toBe(100000);
        expect(readResult.structuredContent?.content?.split('\n').length).toBe(100000);
    }, 30000);

    it('should edit single line in middle of 100k file without corruption', async () => {
        const lines = Array.from({ length: 100000 }, (_, i) => `Line ${i + 1}`);
        const content = lines.join('\n');

        await handleWriteFileIso({ filePath: testFile, content });

        const targetLine = 50000;
        const newContent = 'MODIFIED LINE 50000';

        const editResult = await handleEditFileIso({
            filePath: testFile,
            startLine: targetLine,
            endLine: targetLine,
            newContent
        });

        expect(editResult.structuredContent?.success).toBe(true);

        const readResult = await handleReadFileIso({ filePath: testFile });
        const resultLines = readResult.structuredContent?.content?.split('\n') || [];

        expect(resultLines.length).toBe(100000);
        expect(resultLines[targetLine - 1]).toBe(newContent);
        expect(resultLines[targetLine - 2]).toBe(`Line ${targetLine - 1}`);
        expect(resultLines[targetLine]).toBe(`Line ${targetLine + 1}`);
    }, 30000);

    it('should edit multiple non-consecutive lines without corruption', async () => {
        const lines = Array.from({ length: 100000 }, (_, i) => `Line ${i + 1}`);
        const content = lines.join('\n');

        await handleWriteFileIso({ filePath: testFile, content });

        const edits = [
            { line: 1000, content: 'EDIT 1000' },
            { line: 25000, content: 'EDIT 25000' },
            { line: 50000, content: 'EDIT 50000' },
            { line: 75000, content: 'EDIT 75000' },
            { line: 99000, content: 'EDIT 99000' }
        ];

        for (const edit of edits) {
            const result = await handleEditFileIso({
                filePath: testFile,
                startLine: edit.line,
                endLine: edit.line,
                newContent: edit.content
            });
            expect(result.structuredContent?.success).toBe(true);
        }

        const readResult = await handleReadFileIso({ filePath: testFile });
        const resultLines = readResult.structuredContent?.content?.split('\n') || [];

        expect(resultLines.length).toBe(100000);

        for (const edit of edits) {
            expect(resultLines[edit.line - 1]).toBe(edit.content);
        }

        expect(resultLines[0]).toBe('Line 1');
        expect(resultLines[1]).toBe('Line 2');
        expect(resultLines[999]).toBe('EDIT 1000');
        expect(resultLines[99999]).toBe('Line 100000');
    }, 60000);

    it('should replace range of 100 lines in middle of 100k file', async () => {
        const lines = Array.from({ length: 100000 }, (_, i) => `Line ${i + 1}`);
        const content = lines.join('\n');

        await handleWriteFileIso({ filePath: testFile, content });

        const startLine = 50000;
        const endLine = 50099;
        const replacementLines = Array.from({ length: 100 }, (_, i) => `REPLACED ${startLine + i}`);
        const newContent = replacementLines.join('\n');

        const editResult = await handleEditFileIso({
            filePath: testFile,
            startLine,
            endLine,
            newContent
        });

        expect(editResult.structuredContent?.success).toBe(true);

        const readResult = await handleReadFileIso({ filePath: testFile });
        const resultLines = readResult.structuredContent?.content?.split('\n') || [];

        expect(resultLines.length).toBe(100000);

        for (let i = 0; i < 100; i++) {
            expect(resultLines[startLine - 1 + i]).toBe(`REPLACED ${startLine + i}`);
        }

        expect(resultLines[startLine - 2]).toBe(`Line ${startLine - 1}`);
        expect(resultLines[endLine]).toBe(`Line ${endLine + 1}`);
    }, 30000);

    it('should handle 500 consecutive single-line edits without corruption', async () => {
        const lines = Array.from({ length: 100000 }, (_, i) => `Original ${i + 1}`);
        const content = lines.join('\n');

        await handleWriteFileIso({ filePath: testFile, content });

        const editsCount = 500;
        const editsMap = new Map<number, string>();

        for (let i = 0; i < editsCount; i++) {
            const lineNum = 10000 + i;
            const newContent = `MODIFIED ${lineNum}`;
            editsMap.set(lineNum, newContent);

            const result = await handleEditFileIso({
                filePath: testFile,
                startLine: lineNum,
                endLine: lineNum,
                newContent
            });
            expect(result.structuredContent?.success).toBe(true);
        }

        const readResult = await handleReadFileIso({ filePath: testFile });
        const resultLines = readResult.structuredContent?.content?.split('\n') || [];

        expect(resultLines.length).toBe(100000);

        for (const [lineNum, expectedContent] of editsMap) {
            expect(resultLines[lineNum - 1]).toBe(expectedContent);
        }

        expect(resultLines[0]).toBe('Original 1');
        expect(resultLines[9998]).toBe('Original 9999');
        expect(resultLines[10499]).toBe('Original 10500');
        expect(resultLines[99999]).toBe('Original 100000');
    }, 120000);

    it('should collapse 1000 lines into 1 line without duplication', async () => {
        const lines = Array.from({ length: 100000 }, (_, i) => `Line ${i + 1}`);
        const content = lines.join('\n');

        await handleWriteFileIso({ filePath: testFile, content });

        const startLine = 40000;
        const endLine = 40999;
        const newContent = 'COLLAPSED 1000 LINES INTO THIS ONE';

        const editResult = await handleEditFileIso({
            filePath: testFile,
            startLine,
            endLine,
            newContent
        });

        expect(editResult.structuredContent?.success).toBe(true);

        const readResult = await handleReadFileIso({ filePath: testFile });
        const resultLines = readResult.structuredContent?.content?.split('\n') || [];

        expect(resultLines.length).toBe(99001);
        expect(resultLines[startLine - 1]).toBe(newContent);
        expect(resultLines[startLine - 2]).toBe(`Line ${startLine - 1}`);
        expect(resultLines[startLine]).toBe(`Line ${endLine + 1}`);

        const duplicateCheck = resultLines.filter(line => line === newContent);
        expect(duplicateCheck.length).toBe(1);
    }, 30000);

    it('should expand 1 line into 1000 lines without corruption', async () => {
        const lines = Array.from({ length: 100000 }, (_, i) => `Line ${i + 1}`);
        const content = lines.join('\n');

        await handleWriteFileIso({ filePath: testFile, content });

        const targetLine = 60000;
        const expansionLines = Array.from({ length: 1000 }, (_, i) => `EXPANDED ${i + 1}`);
        const newContent = expansionLines.join('\n');

        const editResult = await handleEditFileIso({
            filePath: testFile,
            startLine: targetLine,
            endLine: targetLine,
            newContent
        });

        expect(editResult.structuredContent?.success).toBe(true);

        const readResult = await handleReadFileIso({ filePath: testFile });
        const resultLines = readResult.structuredContent?.content?.split('\n') || [];

        expect(resultLines.length).toBe(100999);

        for (let i = 0; i < 1000; i++) {
            expect(resultLines[targetLine - 1 + i]).toBe(`EXPANDED ${i + 1}`);
        }

        expect(resultLines[targetLine - 2]).toBe(`Line ${targetLine - 1}`);
        expect(resultLines[targetLine + 999]).toBe(`Line ${targetLine + 1}`);
    }, 30000);

    it('should verify no line duplication or data loss in complex edit sequence', async () => {
        const lines = Array.from({ length: 100000 }, (_, i) => `ID:${i + 1}:DATA`);
        const content = lines.join('\n');

        await handleWriteFileIso({ filePath: testFile, content });

        await handleEditFileIso({
            filePath: testFile,
            startLine: 10000,
            endLine: 10009,
            newContent: 'BLOCK_A'
        });

        await handleEditFileIso({
            filePath: testFile,
            startLine: 49991,
            endLine: 49991,
            newContent: 'LINE_1\nLINE_2\nLINE_3'
        });

        await handleEditFileIso({
            filePath: testFile,
            startLine: 79992,
            endLine: 80091,
            newContent: Array.from({ length: 50 }, (_, i) => `BLOCK_C_${i}`).join('\n')
        });

        const readResult = await handleReadFileIso({ filePath: testFile });
        const resultLines = readResult.structuredContent?.content?.split('\n') || [];

        expect(resultLines[9999]).toBe('BLOCK_A');

        const blockACount = resultLines.filter(line => line === 'BLOCK_A').length;
        expect(blockACount).toBe(1);

        const line1Count = resultLines.filter(line => line === 'LINE_1').length;
        expect(line1Count).toBe(1);

        expect(resultLines[9998]).toBe('ID:9999:DATA');
        expect(resultLines[10000]).toBe('ID:10010:DATA');
    }, 60000);
});
