import { normalize, resolve, isAbsolute } from 'path';

const BASE_PATH = process.env.MCP_ISO_BASE_PATH || process.cwd();

// Validates path is absolute and within BASE_PATH if configured
export function validatePath(filePath: string): { valid: boolean; normalizedPath: string; error?: string } {
    try {
        if (!isAbsolute(filePath)) {
            return {
                valid: false,
                normalizedPath: '',
                error: 'Path must be absolute'
            };
        }

        const normalizedPath = normalize(resolve(filePath));

        if (BASE_PATH) {
            const normalizedBase = normalize(resolve(BASE_PATH));
            if (!normalizedPath.startsWith(normalizedBase)) {
                return {
                    valid: false,
                    normalizedPath,
                    error: `Path must be inside ${BASE_PATH}`
                };
            }
        }

        return { valid: true, normalizedPath };
    } catch (error: any) {
        return { valid: false, normalizedPath: '', error: error.message };
    }
}

// Validates line range is within file bounds and logically consistent
export function validateLineRange(
    startLine: number,
    endLine: number,
    totalLines: number
): { valid: boolean; error?: string } {
    if (startLine < 1) {
        return { valid: false, error: `startLine must be >= 1 (got ${startLine})` };
    }

    if (endLine < 1) {
        return { valid: false, error: `endLine must be >= 1 (got ${endLine})` };
    }

    if (startLine > endLine) {
        return { valid: false, error: `startLine (${startLine}) > endLine (${endLine})` };
    }

    if (startLine > totalLines) {
        return {
            valid: false,
            error: `startLine (${startLine}) exceeds file length (${totalLines} lines)`
        };
    }

    if (endLine > totalLines) {
        return {
            valid: false,
            error: `endLine (${endLine}) exceeds file length (${totalLines} lines)`
        };
    }

    return { valid: true };
}
