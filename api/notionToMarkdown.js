// api/notionToMarkdown.js
import { Client } from "@notionhq/client";
import axios from 'axios';

// Helper function to convert Notion blocks to Markdown
const convertBlocksToMarkdown = (blocks) => {
  let markdown = '';
  
  for (const block of blocks) {
    const type = block.type;
    const blockValue = block[type];
    
    switch (type) {
      case 'paragraph':
        markdown += blockValue.text.map(t => t.plain_text).join('') + '\n';
        break;
      case 'heading_1':
        markdown += `# ${blockValue.text.map(t => t.plain_text).join('')}\n`;
        break;
      case 'heading_2':
        markdown += `## ${blockValue.text.map(t => t.plain_text).join('')}\n`;
        break;
      case 'heading_3':
        markdown += `### ${blockValue.text.map(t => t.plain_text).join('')}\n`;
        break;
      case 'bulleted_list_item':
        markdown += `* ${blockValue.text.map(t => t.plain_text).join('')}\n`;
        break;
      case 'numbered_list_item':
        markdown += `1. ${blockValue.text.map(t => t.plain_text).join('')}\n`;
        break;
      case 'to_do':
        const checked = blockValue.checked ? '[x]' : '[ ]';
        markdown += `${checked} ${blockValue.text.map(t => t.plain_text).join('')}\n`;
        break;
      case 'toggle':
        markdown += `<details><summary>${blockValue.text.map(t => t.plain_text).join('')}</summary>\n\n`;
        markdown += convertBlocksToMarkdown(blockValue.children);
        markdown += '</details>\n';
        break;
      case 'child_page':
        markdown += `[${blockValue.title}](https://notion.so/${block.id.replace(/-/g, '')})\n`;
        break;
      case 'quote':
        markdown += `> ${blockValue.text.map(t => t.plain_text).join('')}\n`;
        break;
      // Handle other block types...
    }
  }
  
  return markdown;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const { notionUrl, notionApiKey } = req.body;
  
  if (!notionUrl || !notionApiKey) {
    return res.status(400).json({ message: 'Notion URL and API Key are required' });
  }
  
  // Extract page ID from URL
  const match = notionUrl.match(/([a-fA-F0-9]{32})/);
  
  if (!match) {
    return res.status(400).json({ message: 'Invalid Notion URL' });
  }
  
  const pageId = match[0];
  
  const notion = new Client({ auth: notionApiKey });
  
  try {
    const response = await notion.blocks.children.list({ block_id: pageId });
    const markdown = convertBlocksToMarkdown(response.results);
    res.status(200).json({ markdown });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data from Notion' });
  }
}