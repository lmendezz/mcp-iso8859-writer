import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { EOL } from 'os';
import * as iconv from 'iconv-lite';
import { logger } from './logger.js';

// Detects line ending style (CRLF/LF) by analyzing content
export function detectLineEnding(content: string): string {
    const crlf = (content.match(/\r\n/g) || []).length;
    const lf = (content.match(/(?<!\r)\n/g) || []).length;

    if (crlf > lf) return '\r\n';
    if (lf > 0) return '\n';
    return EOL;
}

// Creates timestamped backup of file before modification
export function createBackup(filePath: string): string {
    const backupDir = join(dirname(filePath), '.mcp-iso8859-writer');

    if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
    }

    const fileName = filePath.split('/').pop();
    const backupPath = join(backupDir, `${fileName}.backup.${Date.now()}`);
    copyFileSync(filePath, backupPath);
    logger.info(`Backup created: ${backupPath}`);
    return backupPath;
}

// Verifies file encoding integrity by checking for replacement characters
export function verifyEncoding(filePath: string): {
    encoding: string;
    corruptionCount: number;
    isClean: boolean;
} {
    const fileBuffer = readFileSync(filePath);
    const content = iconv.decode(fileBuffer, 'iso-8859-1');

    const corruptionCount = (content.match(/�/g) || []).length;

    return {
        encoding: 'iso-8859-1',
        corruptionCount,
        isClean: corruptionCount === 0
    };
}
