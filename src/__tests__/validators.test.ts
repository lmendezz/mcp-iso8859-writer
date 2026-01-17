import { describe, it, expect } from 'vitest';
import { validatePath, validateLineRange } from '../validators.js';
import { resolve } from 'path';

describe('validatePath', () => {
    it('should reject relative paths', () => {
        const result = validatePath('relative/path.txt');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Path must be absolute');
    });

    it('should accept absolute paths within cwd', () => {
        const testPath = resolve(process.cwd(), 'test.txt');
        const result = validatePath(testPath);
        expect(result.valid).toBe(true);
        expect(result.normalizedPath).toContain('test.txt');
    });

    it('should reject paths outside BASE_PATH when configured', () => {
        const originalBasePath = process.env.MCP_ISO_BASE_PATH;
        process.env.MCP_ISO_BASE_PATH = '/restricted/path';
        
        const result = validatePath('/outside/path.txt');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Path must be inside');
        
        process.env.MCP_ISO_BASE_PATH = originalBasePath;
    });

    it('should handle invalid path edge cases', () => {
        const result = validatePath('\x00invalid');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
    });
});

describe('validateLineRange', () => {
    it('should reject startLine < 1', () => {
        const result = validateLineRange(0, 5, 10);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('startLine must be >= 1');
    });

    it('should reject endLine < 1', () => {
        const result = validateLineRange(1, 0, 10);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('endLine must be >= 1');
    });

    it('should reject startLine > endLine', () => {
        const result = validateLineRange(5, 3, 10);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('startLine (5) > endLine (3)');
    });

    it('should reject startLine exceeding file length', () => {
        const result = validateLineRange(15, 20, 10);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds file length');
    });

    it('should reject endLine exceeding file length', () => {
        const result = validateLineRange(5, 15, 10);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('exceeds file length');
    });

    it('should accept valid range', () => {
        const result = validateLineRange(1, 5, 10);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
    });
});
