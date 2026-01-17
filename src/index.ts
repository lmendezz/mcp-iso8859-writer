#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { handleWriteFileIso, handleEditFileIso, handleReadFileIso } from './handlers';
import { logger } from './logger';

async function main() {
    try {
        logger.info('Starting ISO-8859-1 File Writer MCP Server...');

        const server = new McpServer({
            name: 'mcp-iso8859-writer',
            version: '1.0.0'
        });

        server.registerTool(
            'write_file_iso',
            {
                title: 'Write File (ISO-8859-1)',
                description: 'Creates a new file in ISO-8859-1 encoding. Converts UTF-8 input to ISO-8859-1.',
                inputSchema: {
                    filePath: z.string().describe('Absolute path to the file'),
                    content: z.string().describe('File content in UTF-8 (will be converted to ISO-8859-1)')
                },
                outputSchema: {
                    success: z.boolean(),
                    path: z.string(),
                    encoding: z.string(),
                    corruption_count: z.number(),
                    is_clean: z.boolean()
                }
            },
            handleWriteFileIso
        );

        server.registerTool(
            'edit_file_iso',
            {
                title: 'Edit File (ISO-8859-1)',
                description: 'Edits an existing ISO-8859-1 file, preserving encoding and line endings. Creates automatic backup.',
                inputSchema: {
                    filePath: z.string().describe('Absolute path to the file'),
                    startLine: z.number().int().positive().describe('Start line (1-based)'),
                    endLine: z.number().int().positive().describe('End line (inclusive, 1-based)'),
                    newContent: z.string().describe('Replacement content in UTF-8')
                },
                outputSchema: {
                    success: z.boolean(),
                    path: z.string(),
                    encoding: z.string(),
                    corruption_count: z.number(),
                    is_clean: z.boolean(),
                    lines_replaced: z.number(),
                    total_lines: z.number(),
                    backup_path: z.string()
                }
            },
            handleEditFileIso
        );

        server.registerTool(
            'read_file_iso',
            {
                title: 'Read File (ISO-8859-1)',
                description: 'Reads an ISO-8859-1 file and returns content as UTF-8',
                inputSchema: {
                    filePath: z.string().describe('Absolute path to the file')
                },
                outputSchema: {
                    success: z.boolean(),
                    path: z.string(),
                    content: z.string(),
                    lines: z.number(),
                    line_ending: z.string()
                }
            },
            handleReadFileIso
        );

        const transport = new StdioServerTransport();
        await server.connect(transport);

        logger.info('Server connected and listening...');
    } catch (error: any) {
        logger.error('MCP SERVER CRITICAL ERROR');
        logger.error(`Error: ${error.message}`);
        logger.error(`Stack: ${error.stack}`);
        process.exit(1);
    }
}

main();
