import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../logger.js';

describe('logger', () => {
    let consoleErrorSpy: any;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it('should log info messages to stderr', () => {
        logger.info('Test message');
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleErrorSpy.mock.calls[0][0]).toContain('[INFO]');
        expect(consoleErrorSpy.mock.calls[0][0]).toContain('Test message');
    });

    it('should log error messages to stderr', () => {
        logger.error('Error message');
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleErrorSpy.mock.calls[0][0]).toContain('[ERROR]');
        expect(consoleErrorSpy.mock.calls[0][0]).toContain('Error message');
    });

    it('should log info with context', () => {
        logger.info('Test message', { key: 'value' });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[INFO]'),
            { key: 'value' }
        );
    });

    it('should log error with context', () => {
        logger.error('Error message', { error: 'details' });
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[ERROR]'),
            { error: 'details' }
        );
    });
});
