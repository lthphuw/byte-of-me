// Trie node interface
interface TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  id?: string;
}

export interface Item {
  id?: string;
  word?: string;
}

// Trie class for prefix and full-text search
export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = { children: new Map(), isEndOfWord: false };
  }

  // Insert a word into the Trie
  insert(word: string, id?: string): void {
    if (!word) return;

    let node = this.root;
    const normalizedWord = word.toLowerCase();

    for (const char of normalizedWord) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), isEndOfWord: false });
      }
      node = node.children.get(char)!;
    }
    node.id = id;
    node.isEndOfWord = true;
  }

  // Search for words with a given prefix
  searchPrefix(prefix: string): Item[] {
    if (!prefix) return [];

    const words: Item[] = [];
    let node = this.root;
    const normalizedPrefix = prefix.toLowerCase();

    // Navigate to the node representing the prefix
    for (const char of normalizedPrefix) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char)!;
    }

    // Collect all words starting from this node
    this.collectWords(node, normalizedPrefix, words);
    return words;
  }

  // Helper to collect all words from a node
  private collectWords(node: TrieNode, prefix: string, words: Item[]): void {
    if (node.isEndOfWord) {
      words.push({
        id: node.id,
        word: prefix,
      });
    }

    for (const [char, child] of node.children) {
      this.collectWords(child, prefix + char, words);
    }
  }

  // Check if a word exists in the Trie (for full-text search)
  hasWord(word: string): boolean {
    if (!word) return false;

    let node = this.root;
    const normalizedWord = word.toLowerCase();

    for (const char of normalizedWord) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }

    return node.isEndOfWord;
  }

  // Full-text search: check if all words in a query exist
  fullTextSearch(query: string): boolean {
    if (!query) return true;

    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    if (words.length === 0) return true;

    return words.every((word) => this.hasWord(word));
  }
}
