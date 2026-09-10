/**
 * Bulletin Rich Text Formatter Engine
 * File: src/utils/bulletinFormatter.tsx
 * 
 * Supports user formatting for Ward Bulletins:
 * - *bulletin* for Bold
 * - _bulletin_ for Italic
 * - - Bulletin for Bullets (unordered lists)
 * - 1. bulletin for Numbering (ordered lists)
 */

import React from 'react';

/**
 * Escapes raw text against XSS attacks before formatting
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Applies inline formatting:
 * *bulletin* for Bold (also supports **bulletin**)
 * _bulletin_ for Italic (also supports __bulletin__)
 */
export function formatInlineMarkdown(str: string): string {
  if (!str) return '';
  let s = str;
  // Bold: **text** or *text*
  s = s.replace(/\*\*([^*\n\r]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s([{"'<])\*([^*\n\r]+?)\*(?=[\s)\]}"'>,.;:!?]|$)/g, '$1<strong>$2</strong>');

  // Italic: __text__ or _text_
  s = s.replace(/__([^_]+?)__/g, '<em>$1</em>');
  s = s.replace(/(^|[\s([{"'<])_([^_\n\r]+?)_(?=[\s)\]}"'>,.;:!?]|$)/g, '$1<em>$2</em>');

  return s;
}

export interface BulletinFormatOptions {
  forPrint?: boolean;
  inlineOnly?: boolean;
}

/**
 * Transforms bulletin text into rich HTML:
 * - *bulletin* for Bold
 * - _bulletin_ for Italic
 * - - Bulletin for Bullets (unordered lists)
 * - 1. bulletin for Numbering (ordered lists)
 * - paragraphs and line breaks
 */
export function formatBulletinTextToHtml(text?: string | null, options: BulletinFormatOptions = {}): string {
  if (!text) return '';
  const isPrint = !!options.forPrint;

  if (options.inlineOnly) {
    return formatInlineMarkdown(escapeHtml(text));
  }

  const lines = text.split(/\r?\n/);
  const blocks: { type: 'ul' | 'ol' | 'p'; items: string[] }[] = [];
  let currentBlock: { type: 'ul' | 'ol' | 'p'; items: string[] } | null = null;

  lines.forEach((rawLine) => {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      return;
    }

    // Check bullet: starts with - or * followed by space, e.g. "- Bulletin for Bullets"
    const bulletMatch = rawLine.match(/^\s*[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentBlock || currentBlock.type !== 'ul') {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'ul', items: [] };
      }
      currentBlock.items.push(formatInlineMarkdown(escapeHtml(bulletMatch[1])));
      return;
    }

    // Check numbering: starts with "1. " or "1) "
    const numMatch = rawLine.match(/^\s*(\d+)[\.\)]\s+(.*)$/);
    if (numMatch) {
      if (!currentBlock || currentBlock.type !== 'ol') {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'ol', items: [] };
      }
      currentBlock.items.push(formatInlineMarkdown(escapeHtml(numMatch[2])));
      return;
    }

    // Regular text line
    if (!currentBlock || currentBlock.type !== 'p') {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { type: 'p', items: [] };
    }
    currentBlock.items.push(formatInlineMarkdown(escapeHtml(rawLine)));
  });

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  if (isPrint) {
    return blocks
      .map((b) => {
        if (b.type === 'ul') {
          return `<ul style="margin: 2pt 0 3pt 12pt; padding-left: 0; list-style-type: disc;">${b.items
            .map((it) => `<li style="margin-bottom: 1.5pt;">${it}</li>`)
            .join('')}</ul>`;
        }
        if (b.type === 'ol') {
          return `<ol style="margin: 2pt 0 3pt 12pt; padding-left: 0; list-style-type: decimal;">${b.items
            .map((it) => `<li style="margin-bottom: 1.5pt;">${it}</li>`)
            .join('')}</ol>`;
        }
        return `<p style="margin: 0 0 3pt 0; line-height: 1.35;">${b.items.join('<br/>')}</p>`;
      })
      .join('');
  }

  return blocks
    .map((b) => {
      if (b.type === 'ul') {
        return `<ul class="list-disc pl-5 my-1 space-y-0.5">${b.items
          .map((it) => `<li>${it}</li>`)
          .join('')}</ul>`;
      }
      if (b.type === 'ol') {
        return `<ol class="list-decimal pl-5 my-1 space-y-0.5">${b.items
          .map((it) => `<li>${it}</li>`)
          .join('')}</ol>`;
      }
      return `<p class="leading-relaxed my-0.5">${b.items.join('<br/>')}</p>`;
    })
    .join('');
}

export interface BulletinFormattedTextProps {
  text?: string | null;
  className?: string;
  style?: React.CSSProperties;
  inlineOnly?: boolean;
}

/**
 * Reusable React component that safely renders bulletin formatted text
 */
export function BulletinFormattedText({ text, className = '', style, inlineOnly }: BulletinFormattedTextProps) {
  if (!text) return null;
  const html = formatBulletinTextToHtml(text, { inlineOnly });
  return (
    <div
      className={`bulletin-formatted-content ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const BULLETIN_FORMATTING_HINT = 'Tips: *bulletin* for Bold, _bulletin_ for Italic, - Bulletin for Bullets, 1. bulletin for Numbering';
