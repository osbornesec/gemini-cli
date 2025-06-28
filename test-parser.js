import { parseMarkdownToElements } from './packages/cli/src/ui/utils/markdownParser.js';
import { MARKDOWN_PATTERNS } from './packages/cli/src/ui/utils/markdownConstants.js';

console.log('Testing "- - -"');
const result = parseMarkdownToElements('- - -');
console.log('Parser result:', JSON.stringify(result, null, 2));

console.log('\nTesting HR regex:');
const hrMatch = '- - -'.match(MARKDOWN_PATTERNS.HR);
console.log('HR regex match:', hrMatch);

console.log('\nTesting UL regex:');
const ulMatch = '- - -'.match(MARKDOWN_PATTERNS.UL_ITEM);
console.log('UL regex match:', ulMatch);