import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const toHtml = (text: string) => {
    let processedText = text;

    // Handle bold text first
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Handle links
    processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');

    const lines = processedText.split('\n');
    let html = '';
    let inList = false;
    let inTable = false;
    let tableHeaderParsed = false;

    for (const line of lines) {
      // Unordered Lists
      if (line.match(/^\s*[-*]\s+.*/)) {
        if (!inList) {
          html += '<ul class="list-disc list-inside space-y-2 my-4">';
          inList = true;
        }
        html += `<li>${line.replace(/^\s*[-*]\s+/, '')}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }

        // Tables
        if (line.match(/^\|.*\|$/)) {
          const cells = line.split('|').slice(1, -1).map(c => c.trim());
          if (!inTable) {
            inTable = true;
            html += '<div class="overflow-x-auto my-4"><table class="w-full border-collapse text-left">';
            // This is the header row
            html += '<thead><tr class="bg-gray-100">';
            cells.forEach(header => {
              html += `<th class="border border-border-light p-3">${header}</th>`;
            });
            html += '</tr></thead><tbody>';
            tableHeaderParsed = true;
          } else if (line.includes('---')) {
            // This is the separator line, skip it
            continue;
          } else {
            // This is a body row
            html += '<tr>';
            cells.forEach(cell => {
              html += `<td class="border border-border-light p-3">${cell}</td>`;
            });
            html += '</tr>';
          }
        } else {
          if (inTable) {
            html += '</tbody></table></div>';
            inTable = false;
            tableHeaderParsed = false;
          }

          // Paragraphs (only if not empty)
          if (line.trim()) {
            html += `<p class="my-2">${line}</p>`;
          }
        }
      }
    }

    // Close any open tags at the end
    if (inList) html += '</ul>';
    if (inTable) html += '</tbody></table></div>';

    return html;
  };

  return <div dangerouslySetInnerHTML={{ __html: toHtml(content) }} />;
};

export default MarkdownRenderer;
