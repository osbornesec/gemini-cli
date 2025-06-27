# Plan to Integrate Context7 MCP Server into Gemini CLI

## Overview
I'll hardcode the Context7 MCP server into the Gemini CLI to automatically provide up-to-date documentation context before coding tasks. Context7 is an MCP server that provides real-time, version-specific documentation and code examples directly from official sources, preventing outdated API usage and hallucinations.

This integration will:
1. **Add Context7 as a built-in MCP server**
2. **Detect coding-related queries automatically**
3. **Fetch relevant documentation before sending to Gemini**
4. **Inject the context seamlessly into the conversation**

Context7 information and reference documentation is available at https://github.com/upstash/context7

## Implementation Checklist

### 1. **Add Context7 Configuration as Default**
- [ ] Modify `packages/core/src/tools/mcp-client.ts` to include Context7 as a hardcoded MCP server
- [ ] Add a new constant for Context7 configuration based on the official Context7 MCP setup:
  ```typescript
  const BUILTIN_CONTEXT7_CONFIG: MCPServerConfig = {
    command: 'npx',
    args: ['-y', '@upstash/context7-mcp@latest'],
    trust: true, // Built-in server is trusted by default
    timeout: 15000, // 15 seconds for doc fetching
  };
  ```

### 2. **Modify MCP Discovery Process**
- [ ] Update `discoverMcpTools()` in `packages/core/src/tools/mcp-client.ts` to always include Context7:
  ```typescript
  export async function discoverMcpTools(
    mcpServers: Record<string, MCPServerConfig>,
    mcpServerCommand: string | undefined,
    toolRegistry: ToolRegistry,
  ): Promise<void> {
    // Set discovery state to in progress
    mcpDiscoveryState = MCPDiscoveryState.IN_PROGRESS;

    try {
      // Add Context7 to servers if not already configured
      if (!mcpServers['context7']) {
        mcpServers['context7'] = BUILTIN_CONTEXT7_CONFIG;
      }

      // ... rest of the discovery logic
    }
  }
  ```

### 3. **Create Context Detection Logic**
- [ ] Add a new module `packages/core/src/core/contextDetector.ts`:
  ```typescript
  interface ContextDetectionResult {
    needsContext: boolean;
    libraries: string[];
    confidence: number;
  }

  export async function detectCodingContext(message: string): Promise<ContextDetectionResult> {
    const codingKeywords = [
      'create', 'build', 'implement', 'code', 'function', 'class',
      'api', 'database', 'query', 'component', 'hook', 'route',
      'install', 'import', 'export', 'async', 'await', 'promise'
    ];
    
    const libraryPatterns = [
      /\b(react|vue|angular|next\.?js|nuxt|svelte)\b/i,
      /\b(express|fastify|koa|nest\.?js)\b/i,
      /\b(mongodb|postgres|mysql|redis|supabase)\b/i,
      /\b(typescript|javascript|python|java|go|rust)\b/i
    ];
    
    // Detect coding intent and extract library names
    const lowerMessage = message.toLowerCase();
    const hasCodingIntent = codingKeywords.some(keyword => lowerMessage.includes(keyword));
    const libraries: string[] = [];
    
    for (const pattern of libraryPatterns) {
      const match = message.match(pattern);
      if (match) libraries.push(match[0]);
    }
    
    return {
      needsContext: hasCodingIntent || libraries.length > 0,
      libraries,
      confidence: hasCodingIntent ? 0.8 : 0.5
    };
  }
  ```

### 4. **Implement Pre-processing Hook**
- [ ] Modify `packages/core/src/core/geminiChat.ts` in the `sendMessage` method:
  - [ ] Before sending to Gemini, check if message needs context
  - [ ] If coding-related, automatically invoke Context7 tools
  - [ ] Append retrieved documentation to the user's message

### 5. **Add Context7 Tool Invocation**
- [ ] Create helper function to call Context7 tools using the MCP protocol:
  ```typescript
  async function fetchContext7Documentation(
    query: string, 
    libraries: string[],
    toolRegistry: ToolRegistry
  ): Promise<string> {
    const context7Tools = toolRegistry.getToolsByServer('context7');
    if (!context7Tools || context7Tools.length === 0) {
      return ''; // Context7 not available
    }
    
    const resolveLibraryTool = context7Tools.find(t => t.name.includes('resolve-library-id'));
    const getDocsTool = context7Tools.find(t => t.name.includes('get-library-docs'));
    
    if (!resolveLibraryTool || !getDocsTool) {
      return ''; // Required tools not found
    }
    
    const contextDocs: string[] = [];
    
    for (const library of libraries) {
      try {
        // Step 1: Resolve library name to Context7 ID
        const resolveResult = await resolveLibraryTool.execute({ 
          libraryName: library 
        });
        
        // Extract Context7 library ID from response
        const libraryId = extractLibraryId(resolveResult);
        if (!libraryId) continue;
        
        // Step 2: Fetch documentation
        const docsResult = await getDocsTool.execute({
          context7CompatibleLibraryID: libraryId,
          topic: extractTopicFromQuery(query),
          tokens: 5000 // Limit tokens per library
        });
        
        contextDocs.push(formatDocumentation(library, docsResult));
      } catch (error) {
        console.warn(`Failed to fetch Context7 docs for ${library}:`, error);
      }
    }
    
    return contextDocs.join('\n\n---\n\n');
  }
  ```

### 6. **Update Message Processing**
- [ ] In `sendMessage()` method of `geminiChat.ts`, add pre-processing with proper MCP integration:
  ```typescript
  async sendMessage(
    params: SendMessageParameters,
  ): Promise<GenerateContentResponse> {
    await this.sendPromise;
    
    // Add Context7 pre-processing
    let processedMessage = params.message;
    if (this.config.isContext7Enabled()) {
      const detection = await detectCodingContext(params.message);
      
      if (detection.needsContext && detection.confidence >= this.config.getContext7Threshold()) {
        // Get tool registry from config
        const toolRegistry = await this.config.getToolRegistry();
        
        // Fetch Context7 documentation
        const contextDocs = await fetchContext7Documentation(
          params.message,
          detection.libraries,
          toolRegistry
        );
        
        if (contextDocs) {
          // Append context to message
          processedMessage = `${params.message}\n\n---\nContext7 Documentation:\n${contextDocs}`;
          
          // Optionally notify user about context addition
          if (this.config.showContext7Notifications()) {
            console.log(`📚 Added Context7 documentation for: ${detection.libraries.join(', ')}`);
          }
        }
      }
    }
    
    const userContent = createUserContent(processedMessage);
    const requestContents = this.getHistory(true).concat(userContent);
    
    // ... rest of the sendMessage implementation
  }
  ```

### 7. **Add Configuration Options**
- [ ] Add settings to control Context7 behavior:
  - [ ] `autoContext7`: Enable/disable automatic context fetching (default: true)
  - [ ] `context7Threshold`: Confidence threshold for detection (default: 0.7)
  - [ ] `context7MaxTokens`: Max tokens for documentation (default: 10000)

### 8. **Handle Edge Cases**
- [ ] Graceful fallback if Context7 fails (based on MCP connection status)
- [ ] Avoid duplicate context fetching by tracking processed messages
- [ ] Handle rate limiting with exponential backoff
- [ ] Cache frequently requested documentation using in-memory LRU cache
- [ ] Handle MCP transport errors (StdioClientTransport failures)
- [ ] Manage Context7 server lifecycle properly

### 9. **Add User Feedback**
- [ ] Show loading indicator when fetching context
- [ ] Display what documentation was added
- [ ] Allow users to opt-out per message with flag

### 10. **Testing**
- [ ] Unit tests for context detection
- [ ] Integration tests for Context7 MCP server
- [ ] End-to-end tests for complete flow
- [ ] Performance tests to ensure minimal latency

## File Changes Summary

1. **packages/core/src/tools/mcp-client.ts**
   - [ ] Add `BUILTIN_CONTEXT7_CONFIG` constant
   - [ ] Modify `discoverMcpTools()` to include Context7

2. **packages/core/src/core/contextDetector.ts** (new)
   - [ ] Context detection logic
   - [ ] Library/framework extraction

3. **packages/core/src/core/geminiChat.ts**
   - [ ] Add pre-processing in `sendMessage()`
   - [ ] Integrate context fetching

4. **packages/core/src/config/config.ts**
   - [ ] Add Context7-related configuration options

5. **packages/cli/src/config/settings.ts**
   - [ ] Add UI settings for Context7 control

6. **Tests**
   - [ ] Add comprehensive test coverage

## Technical Implementation Details

### MCP Client Connection
Based on the MCP TypeScript SDK patterns, the Context7 integration will use:

```typescript
// Connection setup using StdioClientTransport
const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@upstash/context7-mcp@latest"]
});

const client = new Client({
  name: "gemini-context7-client",
  version: "1.0.0"
});

await client.connect(transport);
```

### Context7 MCP Tools
Context7 provides two main tools via MCP:
- **`resolve-library-id`**: Converts library names to Context7-compatible IDs
- **`get-library-docs`**: Fetches up-to-date documentation with code examples

### Error Handling Pattern
```typescript
mcpClient.onerror = (error) => {
  console.error(`Context7 MCP ERROR:`, error.toString());
  updateMCPServerStatus('context7', MCPServerStatus.DISCONNECTED);
};
```

This approach ensures Context7 is seamlessly integrated, providing automatic documentation context for coding tasks while maintaining flexibility and performance. The integration leverages the Model Context Protocol (MCP) for standardized communication with the Context7 server.