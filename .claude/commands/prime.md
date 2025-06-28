# Context Window Prime

RUN:
git ls-files

READ:
README.md
Don't begin coding yet. wait for instruction.

# **Advanced Development Guidelines for TypeScript CLI Applications**

## **Core Philosophy**

TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE. Every single line of production code must be written in response to a failing test. No exceptions. This is not a suggestion or a preference \- it is the fundamental practice that enables all other principles in this document.

I follow Test-Driven Development (TDD) with a strong emphasis on behavior-driven testing and functional programming principles, specifically optimized for modern CLI applications using Ink for React terminal interfaces, Google Gemini AI SDK, Model Context Protocol (MCP), and Node.js with TypeScript and ES modules.

## **Quick Reference**

### **Key Principles:**

- Write tests first (TDD) \- never compromise on this
- Test behavior through public APIs, not implementation details
- No any types or type assertions in TypeScript strict mode
- Immutable data patterns with functional programming approach
- Schema-driven development with runtime validation using Zod
- Component-based CLI architecture with Ink React patterns
- Type-safe AI integration with proper error handling
- Observable systems with OpenTelemetry integration
- Fast bundling and development with esbuild

### **Preferred Tools & Stack:**

- Runtime: Node.js 18+ with ES Modules
- Language: TypeScript 5.3.3+ (strict mode always)
- CLI Framework: Ink 5.2.0 (React for terminals) with Yargs for command parsing
- AI Integration: Google Gemini AI SDK with Model Context Protocol (MCP)
- Testing: Vitest with React Testing Library for component testing
- Code Quality: ESLint \+ Prettier with functional programming rules
- Bundling: esbuild for fast compilation and bundling
- Observability: OpenTelemetry for comprehensive monitoring
- Schema Validation: Zod for runtime type safety
- Containerization: Docker/Podman for deployment
- File Operations: Simple Git, fast-glob, html-to-text conversion
- WebSocket Support: Built-in Node.js WebSocket capabilities

## **Testing Principles**

### **Behavior-Driven Testing for CLI Applications**

- Component-Based Testing: Test Ink React components as you would web components, focusing on user interactions and visual output
- Command Interface Testing: Test CLI commands through their public interfaces, not internal implementation
- AI Integration Testing: Mock AI services to test behavior without external dependencies
- File System Testing: Use temporary directories and mock file operations for reproducible tests
- Terminal Output Testing: Verify CLI output and formatting through component testing

### **Stack-Specific Testing Patterns**

#### **Ink React Component Testing**

// ✅ CORRECT \- Testing CLI component behavior through user interactions  
describe("Command selection component", () \=\> {  
 it("should navigate through options with arrow keys", async () \=\> {  
 const { getByText, user } \= render(); // Assuming 'render' and 'user' are from React Testing Library

    // Verify initial state
    expect(getByText("Generate Code")).toHaveClass("selected");

    // Test keyboard navigation
    await user.keyboard("{arrowdown}");
    expect(getByText("Analyze Repository")).toHaveClass("selected");

    // Test selection
    await user.keyboard("{enter}");
    expect(mockOnSelect).toHaveBeenCalledWith("analyze");

});  
});

#### **Yargs Command Testing**

// ✅ CORRECT \- Testing command parsing and execution behavior  
describe("CLI command parsing", () \=\> {  
 it("should parse generate command with required options", async () \=\> {  
 const argv \= await yargs(\["generate", "--type", "component", "--name", "Button"\])  
 .command(generateCommand)  
 .parse();

    expect(argv.type).toBe("component");
    expect(argv.name).toBe("Button");

});  
 it("should execute generate command with proper context", async () \=\> {  
 const mockContext \= getMockCommandContext();

    await executeCommand("generate", {
      type: "component",
      name: "Button"
    }, mockContext);

    expect(mockContext.fileSystem.writeFile).toHaveBeenCalledWith(
      "src/components/Button.tsx",
      expect.stringContaining("export const Button")
    );

});  
});

#### **AI Service Integration Testing**

// ✅ CORRECT \- Testing AI integration with proper mocking  
describe("Gemini AI code generation", () \=\> {  
 it("should generate component code from description", async () \=\> {  
 const mockGemini \= createMockGeminiClient();  
 mockGemini.generateContent.mockResolvedValue({  
 response: {  
 text: () \=\> "export const Button \= () \=\> \<button\>Click me\</button\>;"  
 }  
 });  
 const codeGenerator \= new CodeGenerator(mockGemini);  
 const result \= await codeGenerator.generateComponent({  
 name: "Button",  
 description: "A simple button component"  
 });  
 expect(result.success).toBe(true);  
 expect(result.code).toContain("export const Button");  
 expect(mockGemini.generateContent).toHaveBeenCalledWith({  
 contents: expect.arrayContaining(\[  
 expect.objectContaining({  
 parts: expect.arrayContaining(\[  
 expect.objectContaining({  
 text: expect.stringContaining("button component")  
 })  
 \])  
 })  
 \])  
 });  
 });  
});

#### **Test Data Factory Pattern for CLI Applications**

// Schema-first approach with Zod validation  
const GenerateCommandOptionsSchema \= z.object({  
 type: z.enum(\["component", "service", "utility"\]),  
 name: z.string().min(1),  
 description: z.string().optional(),  
 outputPath: z.string().optional()  
});  
type GenerateCommandOptions \= z.infer\<typeof GenerateCommandOptionsSchema\>;

// Factory functions using real schemas  
const getMockGenerateOptions \= (  
 overrides?: Partial\<GenerateCommandOptions\>  
): GenerateCommandOptions \=\> {  
 const baseOptions \= {  
 type: "component" as const,  
 name: "TestComponent",  
 description: "A test component",  
 outputPath: "src/components"  
 };  
 const options \= { ...baseOptions, ...overrides };

// Validate against real schema to catch type mismatches  
 return GenerateCommandOptionsSchema.parse(options);  
};

## **TypeScript Guidelines for CLI Development**

### **Schema-Driven Development with Zod**

Always define schemas first, then derive types. This ensures runtime validation matches compile-time types across your CLI application.

// ✅ CORRECT \- Schema-first development for CLI commands  
const CommandConfigSchema \= z.object({  
 name: z.string().min(1),  
 description: z.string(),  
 options: z.record(z.object({  
 type: z.enum(\["string", "number", "boolean"\]),  
 description: z.string(),  
 required: z.boolean().default(false),  
 alias: z.string().optional()  
 })),  
 handler: z.function().args(z.any()).returns(z.promise(z.void()))  
});

// Derive TypeScript types from schema  
type CommandConfig \= z.infer\<typeof CommandConfigSchema\>;  
type CommandOption \= z.infer\<typeof CommandConfigSchema\>\['options'\]\[string\];

// Yargs integration with validated schemas  
export const createYargsCommand \= (config: CommandConfig) \=\> {  
 // Runtime validation ensures type safety  
 const validatedConfig \= CommandConfigSchema.parse(config);

return {  
 command: validatedConfig.name,  
 describe: validatedConfig.description,  
 builder: (yargs: Argv) \=\> {  
 Object.entries(validatedConfig.options).forEach((\[key, option\]) \=\> {  
 yargs.option(key, {  
 type: option.type,  
 describe: option.description,  
 demandOption: option.required,  
 alias: option.alias  
 });  
 });  
 return yargs;  
 },  
 handler: validatedConfig.handler  
 };  
};

### **Ink Component Type Safety**

// ✅ Universal CLI component types that work across all contexts  
type CLIComponentProps \= {  
 // Common props for all CLI components  
 isVisible?: boolean;  
 onExit?: () \=\> void;  
 debug?: boolean;  
};

type CommandSelectorProps \= CLIComponentProps & {  
 commands: CommandDefinition\[\];  
 onSelect: (commandId: string) \=\> void;  
 selectedIndex?: number;  
};

// Error handling for CLI components  
type CLIErrorBoundaryProps \= {  
 children: React.ReactNode;  
 fallback?: React.ComponentType\<{ error: Error }\>;  
 onError?: (error: Error, errorInfo: React.ErrorInfo) \=\> void;  
};

### **AI Integration Type Safety**

// ✅ Type-safe AI service interfaces  
const AIPromptSchema \= z.object({  
 role: z.enum(\["system", "user", "assistant"\]),  
 content: z.string().min(1),  
 context: z.record(z.unknown()).optional()  
});

const AIResponseSchema \= z.object({  
 content: z.string(),  
 tokensUsed: z.number().positive(),  
 model: z.string(),  
 timestamp: z.date()  
});

type AIPrompt \= z.infer\<typeof AIPromptSchema\>;  
type AIResponse \= z.infer\<typeof AIResponseSchema\>;

// Type-safe AI service wrapper  
export class TypeSafeGeminiService {  
 constructor(private client: GoogleGenerativeAI) {}

async generateContent(prompts: AIPrompt\[\]): Promise\<Result\<AIResponse, AIError\>\> {  
 try {  
 // Validate inputs  
 const validatedPrompts \= prompts.map(p \=\> AIPromptSchema.parse(p));

      const response \= await this.client.getGenerativeModel({ model: "gemini-pro" })
        .generateContent({
          contents: validatedPrompts.map(p \=\> ({
            role: p.role,
            parts: \[{ text: p.content }\]
          }))
        });
      // Validate and return response
      return {
        success: true,
        data: AIResponseSchema.parse({
          content: response.response.text(),
          tokensUsed: response.response.usageMetadata?.totalTokenCount || 0,
          model: "gemini-pro",
          timestamp: new Date()
        })
      };
    } catch (error) {
      return {
        success: false,
        error: new AIError("Content generation failed", { cause: error })
      };
    }

}  
}

## **Architecture Patterns**

### **CLI Application Structure**

gemini-cli/
├── .claude/ # Claude AI configuration
├── .github/ # GitHub workflows and templates
├── .vscode/ # VS Code settings
├── bundle/ # Built/bundled output
├── docs/ # Documentation
│ ├── cli/ # CLI-specific docs
│ ├── core/ # Core package docs
│ └── tools/ # Tool documentation
├── eslint-rules/ # Custom ESLint rules
├── integration-tests/ # End-to-end tests
├── packages/ # Monorepo packages
│ ├── cli/ # User-facing CLI package
│ │ ├── src/
│ │ │ ├── config/ # Configuration management
│ │ │ ├── ui/ # React/Ink terminal UI
│ │ │ │ ├── components/ # UI components
│ │ │ │ ├── contexts/ # React contexts
│ │ │ │ ├── hooks/ # Custom React hooks
│ │ │ │ ├── themes/ # Color themes
│ │ │ │ └── utils/ # UI utilities
│ │ │ └── utils/ # CLI utilities
│ │ └── index.ts # Entry point
│ └── core/ # Backend/core functionality
│ ├── src/
│ │ ├── code_assist/ # Code assistance features
│ │ ├── config/ # Core configuration
│ │ ├── core/ # Core logic (client, chat, prompts)
│ │ ├── services/ # Services (git, file discovery)
│ │ ├── telemetry/ # Telemetry/logging
│ │ ├── tools/ # Tool implementations
│ │ └── utils/ # Core utilities
│ └── index.ts # Entry point
├── sandbox/ # Sandboxing support
├── scripts/ # Build and development scripts
├── CLAUDE.md # Project-specific Claude AI instructions
├── GEMINI.md # Project documentation
├── README.md # Main readme
├── package.json # Root package.json
└── tsconfig.json # TypeScript configuration

### **Universal Component Architecture with Ink**

// src/components/ui/CommandSelector.tsx  
import { Box, Text, useInput } from 'ink';  
import { useState } from 'react';

export type CommandOption \= {  
 id: string;  
 label: string;  
 description: string;  
 icon?: string;  
};

type CommandSelectorProps \= {  
 options: CommandOption\[\];  
 onSelect: (option: CommandOption) \=\> void;  
 title?: string;  
};

export const CommandSelector: React.FC\<CommandSelectorProps\> \= ({  
 options,  
 onSelect,  
 title \= "Select a command"  
}) \=\> {  
 const \[selectedIndex, setSelectedIndex\] \= useState(0);

useInput((input, key) \=\> {  
 if (key.upArrow) {  
 setSelectedIndex(prev \=\> (prev \> 0 ? prev \- 1 : options.length \- 1));  
 } else if (key.downArrow) {  
 setSelectedIndex(prev \=\> (prev \< options.length \- 1 ? prev \+ 1 : 0));  
 } else if (key.return) {  
 onSelect(options\[selectedIndex\]);  
 }  
 });

return (  
 \<Box flexDirection="column" padding={1}\>  
 \<Text bold color="blue"\>{title}\</Text\>  
 \<Box flexDirection="column" marginTop={1}\>  
 {options.map((option, index) \=\> (  
 \<Box key={option.id} marginY={0}\>  
 \<Text  
 color={index \=== selectedIndex ? "green" : "white"}  
 inverse={index \=== selectedIndex}  
 \>  
 {option.icon ? \`${option.icon} \` : ""}  
 {option.label}  
 \</Text\>  
 {index \=== selectedIndex && (  
 \<Text color="gray" dimColor marginLeft={2}\>  
 {option.description}  
 \</Text\>  
 )}  
 \</Box\>  
 ))}  
 \</Box\>  
 \</Box\>  
 );  
};

### **Command Pattern with Yargs Integration**

// src/cli/commands/generate.ts  
import yargs from 'yargs';  
import { z } from 'zod';

const GenerateOptionsSchema \= z.object({  
 type: z.enum(\["component", "service", "utility"\]),  
 name: z.string().min(1),  
 description: z.string().optional(),  
 output: z.string().default("./src"),  
 typescript: z.boolean().default(true)  
});

type GenerateOptions \= z.infer\<typeof GenerateOptionsSchema\>;

export const generateCommand: yargs.CommandModule\<{}, GenerateOptions\> \= {  
 command: 'generate \<type\> \<name\>',  
 describe: 'Generate code files using AI assistance',

builder: (yargs) \=\> {  
 return yargs  
 .positional('type', {  
 choices: \['component', 'service', 'utility'\] as const,  
 describe: 'Type of code to generate'  
 })  
 .positional('name', {  
 type: 'string',  
 describe: 'Name of the generated item'  
 })  
 .option('description', {  
 alias: 'd',  
 type: 'string',  
 describe: 'Description to guide generation'  
 })  
 .option('output', {  
 alias: 'o',  
 type: 'string',  
 default: './src',  
 describe: 'Output directory'  
 })  
 .option('typescript', {  
 alias: 'ts',  
 type: 'boolean',  
 default: true,  
 describe: 'Generate TypeScript files'  
 });  
 },

handler: async (argv) \=\> {  
 const options \= GenerateOptionsSchema.parse(argv);

    // Execute generation logic
    const generator \= new CodeGenerator();
    await generator.generate(options);

}  
};

## **Development Workflow**

### **TDD Process for CLI Development**

CRITICAL: Every CLI feature must start with a failing test, then work backwards to implementation:

- Red: Write a failing test that describes CLI user behavior
- Red: Write failing tests for command parsing and validation
- Red: Write failing tests for AI service integration
- Green: Implement minimal code to make tests pass
- Refactor: Improve code structure while maintaining all tests

### **Example TDD Workflow for CLI Command**

// Step 1: E2E test defining CLI behavior  
describe("Generate command workflow", () \=\> {  
 it("should generate React component from description", async () \=\> {  
 // This test will fail initially \- no implementation exists  
 const result \= await executeCliCommand(\[  
 "generate", "component", "UserCard",  
 "--description", "A card component displaying user information"  
 \]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("✓ Generated UserCard component");

    // Verify file was created
    const generatedFile \= await fs.readFile("src/components/UserCard.tsx", "utf-8");
    expect(generatedFile).toContain("export const UserCard");
    expect(generatedFile).toContain("user information");

});  
});

// Step 2: Command parsing test  
describe("Generate command parser", () \=\> {  
 it("should parse component generation arguments", () \=\> {  
 const parsed \= parseGenerateCommand(\[  
 "component", "UserCard",  
 "--description", "A card component"  
 \]);

    expect(parsed.type).toBe("component");
    expect(parsed.name).toBe("UserCard");
    expect(parsed.description).toBe("A card component");

});  
});

// Step 3: AI service test  
describe("Component generator service", () \=\> {  
 it("should generate React component code", async () \=\> {  
 const mockAI \= createMockAIService();  
 mockAI.generateContent.mockResolvedValue({  
 content: "export const UserCard \= () \=\> \<div\>User card\</div\>;"  
 });

    const generator \= new ComponentGenerator(mockAI);
    const result \= await generator.generate({
      name: "UserCard",
      description: "A card component"
    });

    expect(result.code).toContain("export const UserCard");

});  
});

// Step 4: Minimal implementation  
export const generateComponent \= async (options: GenerateOptions): Promise\<void\> \=\> {  
 const aiService \= new GeminiService();  
 const prompt \= \`Generate a React component named ${options.name}: ${options.description}\`;

const response \= await aiService.generateContent(\[{  
 role: "user",  
 content: prompt  
 }\]);

if (response.success) {  
 await writeFile(\`src/components/${options.name}.tsx\`, response.data.content);  
 console.log(\`✓ Generated ${options.name} component\`);  
 }  
};

### **Build Configuration with esbuild**

// build.config.ts  
import { build } from 'esbuild';

const buildConfig \= {  
 entryPoints: \['src/cli/index.ts'\],  
 bundle: true,  
 platform: 'node' as const,  
 target: 'node18',  
 format: 'esm' as const,  
 outfile: 'dist/cli.js',  
 external: \[  
 // Mark Node.js built-ins as external  
 'fs', 'path', 'os', 'crypto', 'stream'  
 \],  
 banner: {  
 js: '\#\!/usr/bin/env node'  
 }  
};

export const buildCLI \= () \=\> build(buildConfig);

### **OpenTelemetry Integration**

// src/utils/telemetry.ts  
import { NodeSDK } from '@opentelemetry/sdk-node';  
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export const setupTelemetry \= (): NodeSDK \=\> {  
 const sdk \= new NodeSDK({  
 instrumentations: \[getNodeAutoInstrumentations()\]  
 });  
 sdk.start();  
 return sdk;  
};

// Command execution with tracing  
export const withTracing \= \<T extends unknown\[\], R\>(  
 name: string,  
 fn: (...args: T) \=\> Promise\<R\>  
) \=\> {  
 return async (...args: T): Promise\<R\> \=\> {  
 const span \= trace.getTracer('cli').startSpan(name);

    try {
      const result \= await fn(...args);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      span.end();
    }

};  
};

## **Performance and Optimization Patterns**

### **Node.js ES Modules Optimization**

// package.json configuration for ES modules  
{  
 "type": "module",  
 "exports": {  
 ".": {  
 "types": "./dist/index.d.ts",  
 "import": "./dist/index.js"  
 }  
 },  
 "scripts": {  
 "build": "esbuild src/cli/index.ts \--bundle \--platform=node \--format=esm \--outfile=dist/cli.js \--external:fs \--external:path",  
 "test": "vitest",  
 "lint": "eslint src/\*\*/\*.ts",  
 "format": "prettier \--write src/\*\*/\*.ts"  
 }  
}

### **Fast File Operations with Glob Patterns**

// src/services/files/reader.ts  
import fg from 'fast-glob';  
import { readFile } from 'fs/promises';

export class FileReader {  
 async readMultipleFiles(patterns: string\[\]): Promise\<FileContent\[\]\> {  
 // Use fast-glob for efficient file discovery  
 const filePaths \= await fg(patterns, {  
 ignore: \['node_modules/\*\*', '.git/\*\*'\],  
 absolute: true  
 });  
 // Read files in parallel for better performance  
 const fileContents \= await Promise.all(  
 filePaths.map(async (path) \=\> ({  
 path,  
 content: await readFile(path, 'utf-8')  
 }))  
 );  
 return fileContents;  
 }

async analyzeCodebase(rootPath: string): Promise\<CodebaseAnalysis\> {  
 const patterns \= \[  
 \`${rootPath}/\*\*/\*.{ts,tsx,js,jsx}\`,  
      \`${rootPath}/\*\*/\*.{json,md,yml,yaml}\`,  
 \`\!${rootPath}/node\_modules/\*\*\`,  
      \`\!${rootPath}/.git/\*\*\`  
 \];  
 const files \= await this.readMultipleFiles(patterns);

    return {
      totalFiles: files.length,
      languages: this.detectLanguages(files),
      structure: this.analyzeStructure(files)
    };

}  
}

### **HTML to Text Conversion for Documentation**

// src/services/files/converter.ts  
import { convert } from 'html-to-text';

export class DocumentConverter {  
 htmlToText(html: string): string {  
 return convert(html, {  
 wordwrap: 80,  
 preserveNewlines: true,  
 selectors: \[  
 { selector: 'h1', options: { uppercase: false } },  
 { selector: 'h2', options: { uppercase: false } },  
 { selector: 'code', options: { noWrap: true } },  
 { selector: 'pre', options: { noWrap: true } }  
 \]  
 });  
 }

async processDocumentation(htmlContent: string): Promise\<ProcessedDoc\> {  
 const textContent \= this.htmlToText(htmlContent);

    return {
      plainText: textContent,
      wordCount: textContent.split(/\\s+/).length,
      sections: this.extractSections(textContent)
    };

}  
}

## **Error Handling and Observability**

### **Comprehensive Error Handling for CLI**

// src/utils/errors.ts  
export class CLIError extends Error {  
 constructor(  
 message: string,  
 public readonly code: string,  
 public readonly exitCode: number \= 1,  
 public readonly context?: Record\<string, unknown\>  
 ) {  
 super(message);  
 this.name \= 'CLIError';  
 }  
}

export class AIServiceError extends CLIError {  
 constructor(message: string, context?: Record\<string, unknown\>) {  
 super(message, 'AI_SERVICE_ERROR', 1, context);  
 this.name \= 'AIServiceError';  
 }  
}

export class FileOperationError extends CLIError {  
 constructor(message: string, context?: Record\<string, unknown\>) {  
 super(message, 'FILE_OPERATION_ERROR', 1, context);  
 this.name \= 'FileOperationError';  
 }  
}

// Global error handler for CLI  
export const handleCLIError \= (error: unknown): never \=\> {  
 if (error instanceof CLIError) {  
 console.error(\`❌ ${error.message}\`);  
 if (error.context) {  
 console.error('Context:', error.context);  
 }  
 process.exit(error.exitCode);  
 }

console.error('❌ Unexpected error:', error);  
 process.exit(1);  
};

### **Ink Error Boundary for UI Components**

// src/components/ui/ErrorBoundary.tsx  
import { Box, Text } from 'ink';  
import React from 'react';

type ErrorBoundaryState \= {  
 hasError: boolean;  
 error?: Error;  
};

export class CLIErrorBoundary extends React.Component\<  
 { children: React.ReactNode },  
 ErrorBoundaryState  
\> {  
 constructor(props: { children: React.ReactNode }) {  
 super(props);  
 this.state \= { hasError: false };  
 }

static getDerivedStateFromError(error: Error): ErrorBoundaryState {  
 return { hasError: true, error };  
 }

componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {  
 // Log to telemetry  
 trace.getTracer('cli').startSpan('ui-error').setAttributes({  
 'error.message': error.message,  
 'error.stack': error.stack || '',  
 'component.stack': errorInfo.componentStack  
 }).end();  
 }

render() {  
 if (this.state.hasError) {  
 return (  
 \<Box flexDirection="column" padding={1}\>  
 \<Text color="red" bold\>❌ Something went wrong\</Text\>  
 \<Text color="gray"\>{this.state.error?.message}\</Text\>  
 \<Text color="yellow" marginTop={1}\>Press Ctrl+C to exit\</Text\>  
 \</Box\>  
 );  
 }  
 return this.props.children;  
 }  
}

## **Containerization with Docker/Podman**

\# Dockerfile  
FROM node:18-alpine AS builder  
WORKDIR /app  
COPY package.json package-lock.json ./  
RUN npm ci \--only=production  
COPY . .  
RUN npm run build

FROM node:18-alpine AS runtime  
WORKDIR /app  
COPY \--from=builder /app/dist ./dist  
COPY \--from=builder /app/node_modules ./node_modules  
COPY \--from=builder /app/package.json ./

\# Create non-root user  
RUN addgroup \-g 1001 \-S nodejs && \\  
 adduser \-S cli \-u 1001  
USER cli

ENTRYPOINT \["node", "dist/cli.js"\]  
\`\`\`text  
\# docker-compose.yml for development  
version: '3.8'  
services:  
 cli-dev:  
 build: .  
 volumes:  
 \- .:/app  
 \- /app/node_modules  
 environment:  
 \- NODE_ENV=development  
 command: npm run dev

## **Summary**

This system represents a comprehensive approach to CLI development that prioritizes:

- Type Safety First: Every layer uses TypeScript with strict validation
- Test-Driven Development: No compromises on TDD methodology
- Component-Based UI: Leverage React patterns in the terminal with Ink
- AI Integration: Type-safe integration with Google Gemini and MCP
- Performance: Fast bundling with esbuild and efficient file operations
- Observability: Comprehensive monitoring with OpenTelemetry
- Developer Experience: Modern tooling with ESLint, Prettier, and Vitest

The integration of these technologies enables rapid CLI development while maintaining code quality, type safety, and performance. The use of React components for CLI interfaces provides a familiar development model while leveraging the power of AI services for intelligent code generation and analysis.
