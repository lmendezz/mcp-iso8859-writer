import { readFileSync, existsSync } from 'fs';
import * as iconv from 'iconv-lite';
import writeFileAtomic from 'write-file-atomic';
import { validatePath, validateLineRange } from './validators.js';
import { detectLineEnding, createBackup, verifyEncoding } from './utils.js';
import { logger } from './logger.js';

// Writes UTF-8 content to file in ISO-8859-1 encoding
export async function handleWriteFileIso({ filePath, content }: { filePath: string; content: string }) {
    try {
        const pathValidation = validatePath(filePath);
        if (!pathValidation.valid) {
            throw new Error(pathValidation.error);
        }

        const iso8859Content = iconv.encode(content, 'iso-8859-1');

        await writeFileAtomic(pathValidation.normalizedPath, iso8859Content);
        logger.info(`File written: ${pathValidation.normalizedPath}`);

        const verification = verifyEncoding(pathValidation.normalizedPath);

        const output = {
            success: true,
            path: pathValidation.normalizedPath,
            encoding: verification.encoding,
            corruption_count: verification.corruptionCount,
            is_clean: verification.isClean
        };

        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error: any) {
        logger.error('write_file_iso error', error.message);
        return {
            content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
            isError: true
        };
    }
}

// Edits line range in ISO-8859-1 file preserving encoding and line endings
export async function handleEditFileIso({
    filePath,
    startLine,
    endLine,
    newContent
}: {
    filePath: string;
    startLine: number;
    endLine: number;
    newContent: string
}) {
    try {
        const pathValidation = validatePath(filePath);
        if (!pathValidation.valid) {
            throw new Error(pathValidation.error);
        }

        const normalizedPath = pathValidation.normalizedPath;

        if (!existsSync(normalizedPath)) {
            throw new Error(`File does not exist: ${normalizedPath}`);
        }

        const backupPath = createBackup(normalizedPath);

        const fileBuffer = readFileSync(normalizedPath);
        const fileContent = iconv.decode(fileBuffer, 'iso-8859-1');

        const lineEnding = detectLineEnding(fileContent);
        logger.info(`Detected line ending: ${lineEnding === '\r\n' ? 'CRLF' : 'LF'}`);

        const lines = fileContent.split(/\r?\n/);
        const totalLines = lines.length;

        const rangeValidation = validateLineRange(startLine, endLine, totalLines);
        if (!rangeValidation.valid) {
            throw new Error(rangeValidation.error);
        }

        const newLines = newContent.split(/\r?\n/);
        const linesReplaced = endLine - startLine + 1;

        logger.info(`Replacing lines ${startLine}-${endLine} (${linesReplaced} lines) with ${newLines.length} new lines`);

        lines.splice(startLine - 1, linesReplaced, ...newLines);

        const updatedContent = lines.join(lineEnding);

        const iso8859Content = iconv.encode(updatedContent, 'iso-8859-1');

        await writeFileAtomic(normalizedPath, iso8859Content);
        logger.info(`File updated: ${normalizedPath}`);

        const verification = verifyEncoding(normalizedPath);

        const output = {
            success: true,
            path: normalizedPath,
            encoding: verification.encoding,
            corruption_count: verification.corruptionCount,
            is_clean: verification.isClean,
            lines_replaced: linesReplaced,
            total_lines: lines.length,
            backup_path: backupPath
        };

        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error: any) {
        logger.error('edit_file_iso error', error.message);
        return {
            content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
            isError: true
        };
    }
}

// Reads ISO-8859-1 file and returns content as UTF-8
export async function handleReadFileIso({ filePath }: { filePath: string }) {
    try {
        const pathValidation = validatePath(filePath);
        if (!pathValidation.valid) {
            throw new Error(pathValidation.error);
        }

        const normalizedPath = pathValidation.normalizedPath;

        if (!existsSync(normalizedPath)) {
            throw new Error(`File does not exist: ${normalizedPath}`);
        }

        const fileBuffer = readFileSync(normalizedPath);
        const content = iconv.decode(fileBuffer, 'iso-8859-1');

        const lineEnding = detectLineEnding(content);
        const lines = content.split(/\r?\n/).length;

        const output = {
            success: true,
            path: normalizedPath,
            content: content,
            lines: lines,
            line_ending: lineEnding === '\r\n' ? 'CRLF' : 'LF'
        };

        return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output
        };
    } catch (error: any) {
        logger.error('read_file_iso error', error.message);
        return {
            content: [{ type: 'text' as const, text: `Error: ${error.message}` }],
            isError: true
        };
    }
}
