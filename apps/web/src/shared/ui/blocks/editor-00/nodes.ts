import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import type {
  Klass,
  LexicalNode,
  LexicalNodeReplacement} from 'lexical';
import {
  ParagraphNode,
  TextNode,
} from 'lexical';

export const nodes: ReadonlyArray<Klass<LexicalNode> | LexicalNodeReplacement> =
  [HeadingNode, ParagraphNode, TextNode, QuoteNode];
