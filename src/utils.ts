import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join, basename, relative, resolve } from 'path';
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

function getBackupRoot(): string {
    if (process.env.MCP_ISO_BACKUP_ROOT) {
        return resolve(process.env.MCP_ISO_BACKUP_ROOT);
    }
    return process.cwd();
}

export function createBackup(filePath: string): string {
    const projectRoot = getBackupRoot();
    const backupBaseDir = join(projectRoot, '.mcp-iso8859-writer');

    const relativePath = relative(projectRoot, filePath);
    const relativeDir = dirname(relativePath);

    let backupDir: string;
    if (relativeDir === '.' || relativePath.startsWith('..')) {
        backupDir = join(backupBaseDir, 'external');
    } else {
        backupDir = join(backupBaseDir, relativeDir);
    }

    if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
    }

    const fileName = basename(filePath);
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
