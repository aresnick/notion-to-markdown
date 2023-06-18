// api/notionToMarkdown.js
import { Client } from "@notionhq/client";
import axios from 'axios';

function convertTextWithAnnotations(textItems) {
  return textItems.map(item => {
    let text = item.plain_text;
    const annotation = item.annotations;
    const link = item.href;
    if (annotation.bold) {
      text = `**${text}**`;
    }

    if (annotation.italic) {
      text = `*${text}*`;
    }

    if (annotation.strikethrough) {
      text = `~~${text}~~`;
    }

    if (annotation.underline) {
      text = `__${text}__`;
    }

    if (link) {
      text = `[${text}](${link})`;
    }

    return text;
  }).join(' ');
}

function convertBlocksToMarkdown(blocks) {
  let markdown = "";

  for (const block of blocks) {
    let blockText = '';
    switch (block.type) {
      case "paragraph":
        if (block.paragraph.rich_text) {
          blockText = convertTextWithAnnotations(block.paragraph.rich_text);
          markdown += blockText;
        }
        break;
      case "heading_1":
        if (block.heading_1.rich_text) {
          blockText = convertTextWithAnnotations(block.heading_1.rich_text);
          markdown += `# ${blockText}`;
        }
        break;
      case "heading_2":
        if (block.heading_2.rich_text) {
          blockText = convertTextWithAnnotations(block.heading_2.rich_text);
          markdown += `## ${blockText}`;
        }
        break;
      case "heading_3":
        if (block.heading_3.rich_text) {
          blockText = convertTextWithAnnotations(block.heading_3.rich_text);
          markdown += `### ${blockText}`;
        }
        break;
      case "bulleted_list_item":
        if (block.bulleted_list_item.rich_text) {
          blockText = convertTextWithAnnotations(block.bulleted_list_item.rich_text);
          markdown += `- ${blockText}`;
        }
        break;
      case "numbered_list_item":
        if (block.numbered_list_item.rich_text) {
          blockText = convertTextWithAnnotations(block.numbered_list_item.rich_text);
          markdown += `1. ${blockText}`;
        }
        break;
      case "to_do":
        if (block.to_do.rich_text) {
          blockText = convertTextWithAnnotations(block.to_do.rich_text);
          markdown += `- [ ] ${blockText}`;
        }
        break;
      case "toggle":
        if (block.toggle.rich_text) {
          blockText = convertTextWithAnnotations(block.toggle.rich_text);
          markdown += `- ${blockText}`;
        }
        break;
      case "child_page":
        markdown += `[${block.child_page.title}](https://www.notion.so/${block.id.replace(/-/g, '')})`;
        break;
      case "image":
        if (block.image && block.image.external && block.image.external.url) {
          markdown += `![Image](${block.image.external.url})`;
        } else if (block.image && block.image.file && block.image.file.url) {
          markdown += `![Image](${block.image.file.url})`;
        }
      break;
      case "embed":
        markdown += `[Embed Link](${block.embed.url})`;
        break;
      case "video":
        if (block.video && block.video.external && block.video.external.url) {
          markdown += `![Video](${block.video.external.url})`;
        }
      break;
      default:
        break;
    }

    markdown += "\n\n"; // Add two newlines to separate blocks
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
    console.log(error)
    res.status(500).json({ message: 'Error fetching data from Notion' });
  }
}