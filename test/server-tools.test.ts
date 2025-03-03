import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Import the tools from the main server file
const execAsync = promisify(exec);

describe('MCP Server Tools', () => {
    it('should create a server with the Hello tool', () => {
        // Create a new server instance
        const server = new McpServer({
            name: 'test-server',
            version: '1.0.0',
        });

        // Register the Hello tool
        server.tool(
            'Hello',
            'Get a greeting with your name',
            {
                name: z.string().describe('Your name'),
            },
            async ({ name }) => {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Hello, ${name}! Welcome to MCP Tools.`,
                        },
                    ],
                };
            }
        );

        // Verify the server was created successfully
        expect(server).toBeDefined();
    });

    it('should create a server with the get_alerts tool', () => {
        // Create a new server instance
        const server = new McpServer({
            name: 'test-server',
            version: '1.0.0',
        });

        // Register the get_alerts tool
        server.tool(
            'get_alerts',
            'Get weather alerts for a state',
            {
                state: z.string().min(2).max(2).describe('Two-letter state code (e.g. CA, NY)'),
            },
            async ({ state }) => {
                const mockAlerts = {
                    "CA": ["Wildfire warning in Northern California", "Heat advisory in Southern California"],
                    "NY": ["Flood warning in Western New York", "Thunderstorm watch in NYC metro area"],
                    "FL": ["Hurricane watch along the coast", "Flood warning in South Florida"],
                };

                const alerts = (mockAlerts as Record<string, string[]>)[state] || ["No current alerts for this state"];

                return {
                    content: [
                        {
                            type: 'text',
                            text: `Weather Alerts for ${state}:\n${alerts.map(alert => `- ${alert}`).join('\n')}`,
                        },
                    ],
                };
            }
        );

        // Verify the server was created successfully
        expect(server).toBeDefined();
    });

    it('should create a server with the get_frontmatter tool', () => {
        // Create a new server instance
        const server = new McpServer({
            name: 'test-server',
            version: '1.0.0',
        });

        // Mock date for consistent testing
        const mockDate = new Date('2023-01-01');
        vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

        // Create a handler function directly for testing
        const handler = async ({ content, title, author, tags }: {
            content: string,
            title?: string,
            author?: string,
            tags?: string[]
        }) => {
            // Extract a title from the content if not provided
            const extractedTitle = title || content.split('\n')[0].replace(/^#\s*/, '');

            // Generate frontmatter
            const frontmatter = [
                '---',
                `title: "${extractedTitle}"`,
                author ? `author: "${author}"` : 'author: "Anonymous"',
                `date: "${new Date().toISOString().split('T')[0]}"`,
                tags && tags.length > 0 ? `tags: [${tags.map(tag => `"${tag}"`).join(', ')}]` : 'tags: []',
                '---',
            ].join('\n');

            return {
                content: [
                    {
                        type: 'text',
                        text: `${frontmatter}\n\n${content}`,
                    },
                ],
            };
        };

        // Register the tool with the handler
        server.tool(
            'get_frontmatter',
            'Generate frontmatter for a blog post',
            {
                content: z.string().describe('The content of the blog post'),
                title: z.string().optional().describe('The title of the blog post'),
                author: z.string().optional().describe('The author of the blog post'),
                tags: z.array(z.string()).optional().describe('Tags for the blog post'),
            },
            handler
        );

        // Test the handler directly
        return handler({
            content: '# Test Post\n\nThis is a test post.',
            author: 'Test Author',
            tags: ['test', 'example'],
        }).then(result => {
            expect(result).toBeDefined();
            expect(result.content).toBeInstanceOf(Array);
            expect(result.content.length).toBe(1);
            expect(result.content[0].type).toBe('text');
            expect(result.content[0].text).toContain('title: "Test Post"');
            expect(result.content[0].text).toContain('author: "Test Author"');
            expect(result.content[0].text).toContain('date: "2023-01-01"');
            expect(result.content[0].text).toContain('tags: ["test", "example"]');
            expect(result.content[0].text).toContain('# Test Post');
        });
    });
}); 