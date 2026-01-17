// Custom logger that writes to stderr (never stdout for MCP protocol compliance)
export const logger = {
    info: (message: string, context?: any) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}][INFO] ${message}`, context || '');
    },
    error: (message: string, context?: any) => {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}][ERROR] ${message}`, context || '');
    }
};
