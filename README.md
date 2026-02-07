# ISO-8859-1 File Writer MCP

[![npm version](https://badge.fury.io/js/mcp-iso8859-writer.svg)](https://www.npmjs.com/package/mcp-iso8859-writer)

MCP server for writing files in ISO-8859-1 encoding. Designed for legacy codebases that require ISO-8859-1 instead of UTF-8.

## The Problem

AI agents (Claude, Cursor, etc.) generate code in UTF-8. When working with legacy codebases that use ISO-8859-1 encoding, direct file writes corrupt special characters (accents, ñ, etc.). This MCP transparently converts UTF-8 to ISO-8859-1.

## Installation

Add the following configuration to your MCP settings:

```json
{
  "mcpServers": {
    "iso-writer": {
      "command": "npx",
      "args": ["-y", "mcp-iso8859-writer"]
    }
  }
}
```

**Configuration file location:**
- **Claude Code**: `.mcp.json` (project) or `~/.claude/settings.json` (global)
- **Cursor**: MCP settings
- **Claude Desktop**: `claude_desktop_config.json`

### Optional: Restrict to a directory

By default, the MCP can write to any absolute path. To restrict operations to a specific directory, set the `MCP_ISO_BASE_PATH` environment variable:

```json
{
  "mcpServers": {
    "iso-writer": {
      "command": "npx",
      "args": ["-y", "mcp-iso8859-writer"],
      "env": {
        "MCP_ISO_BASE_PATH": "/var/www/html"
      }
    }
  }
}
```

### Optional: Customize backup location

Backups are stored in a centralized `.mcp-iso8859-writer/` directory. By default, this is created in the current working directory. To specify a custom location:

```json
{
  "mcpServers": {
    "iso-writer": {
      "command": "npx",
      "args": ["-y", "mcp-iso8859-writer"],
      "env": {
        "MCP_ISO_BACKUP_ROOT": "/path/to/project"
      }
    }
  }
}
```

The backup system preserves directory structure within the backup folder.

## Tools

### `write_file_iso`

Creates a new file in ISO-8859-1 encoding.

**Input:**
- `filePath`: Absolute path to the file
- `content`: File content in UTF-8

**Output:**
- `success`: boolean
- `path`: normalized path
- `encoding`: "iso-8859-1"
- `corruption_count`: number of corrupted characters
- `is_clean`: true if no corruption

### `edit_file_iso`

Edits an existing ISO-8859-1 file by replacing specific lines. Automatically creates a backup before editing.

**Input:**
- `filePath`: Absolute path to the file
- `startLine`: Start line (1-based)
- `endLine`: End line (inclusive, 1-based)
- `newContent`: Replacement content in UTF-8

**Output:**
- `success`: boolean
- `path`: normalized path
- `encoding`: "iso-8859-1"
- `corruption_count`: number of corrupted characters
- `is_clean`: true if no corruption
- `lines_replaced`: number of lines replaced
- `total_lines`: total lines in file after edit
- `backup_path`: path to backup file

### `read_file_iso`

Reads an ISO-8859-1 file and returns content as UTF-8.

**Input:**
- `filePath`: Absolute path to the file

**Output:**
- `success`: boolean
- `path`: normalized path
- `content`: file content converted to UTF-8
- `lines`: number of lines
- `line_ending`: "CRLF" or "LF"

## Features

- **Atomic writes**: Uses `write-file-atomic` to prevent file corruption on interrupted writes
- **Automatic backups**: Creates timestamped backup before every edit
- **Line ending preservation**: Detects and preserves CRLF (Windows) or LF (Unix) line endings
- **Encoding verification**: Reports any characters that couldn't be converted cleanly

## Development

```bash
git clone https://github.com/lmendezz/mcp-iso8859-writer.git
cd mcp-iso8859-writer
npm install
npm run dev    # Run with tsx (hot reload)
npm run build  # Compile TypeScript
npm test       # Run tests
```

## License

MIT
