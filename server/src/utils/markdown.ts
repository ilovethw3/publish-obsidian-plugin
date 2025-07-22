import MarkdownIt from 'markdown-it';
import fs from 'fs/promises';
import path from 'path';
import { Post } from '../../../shared/types';
import { logger } from '../middleware/logger';

export class MarkdownRenderer {
  private md: MarkdownIt;
  private template: string | null = null;

  constructor() {
    this.md = new MarkdownIt({
      html: true,          // Enable HTML tags in source
      xhtmlOut: true,      // Use '/' to close single tags (<br />)
      breaks: true,        // Convert '\n' in paragraphs into <br>
      linkify: true,       // Autoconvert URL-like text to links
      typographer: true,   // Enable some language-neutral replacement + quotes beautification
    });

    // Configure plugins or custom rules if needed
    this.configureMarkdown();
  }

  private configureMarkdown(): void {
    // Add custom rendering rules if needed
    // For example, to handle code blocks with syntax highlighting
    
    // Custom link rendering to add target="_blank" for external links
    const defaultRender = this.md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
      return self.renderToken(tokens, idx, options);
    };

    this.md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
      const token = tokens[idx];
      const href = token.attrGet('href');
      
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        token.attrPush(['target', '_blank']);
        token.attrPush(['rel', 'noopener noreferrer']);
      }
      
      return defaultRender(tokens, idx, options, env, self);
    };
  }

  /**
   * Render Markdown to HTML string
   */
  render(markdown: string): string {
    try {
      return this.md.render(markdown);
    } catch (error) {
      logger.error('Markdown rendering failed', { error });
      throw new Error('Failed to render markdown content');
    }
  }

  /**
   * Load HTML template
   */
  private async loadTemplate(): Promise<string> {
    if (this.template) {
      return this.template;
    }

    try {
      const templatePath = path.join(__dirname, '../templates/article.html');
      this.template = await fs.readFile(templatePath, 'utf-8');
      return this.template;
    } catch (error) {
      logger.error('Failed to load HTML template', { error });
      
      // Fallback template
      this.template = this.getDefaultTemplate();
      return this.template;
    }
  }

  /**
   * Get default HTML template if file is not found
   */
  private getDefaultTemplate(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        h1 {
            border-bottom: 2px solid #3498db;
            padding-bottom: 0.3em;
        }
        p {
            margin-bottom: 1em;
        }
        code {
            background: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9em;
        }
        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 1em 0;
        }
        pre code {
            background: none;
            padding: 0;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 1em 0;
            padding-left: 1em;
            color: #666;
        }
        ul, ol {
            padding-left: 2em;
            margin-bottom: 1em;
        }
        li {
            margin-bottom: 0.5em;
        }
        a {
            color: #3498db;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin: 1em 0;
        }
        .article-header {
            border-bottom: 1px solid #eee;
            margin-bottom: 2em;
            padding-bottom: 1em;
        }
        .article-meta {
            color: #666;
            font-size: 0.9em;
            margin-top: 1em;
        }
        .article-footer {
            border-top: 1px solid #eee;
            margin-top: 3em;
            padding-top: 1em;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            h1 {
                font-size: 1.5em;
            }
        }
    </style>
</head>
<body>
    <article>
        <header class="article-header">
            <h1>{{title}}</h1>
            <div class="article-meta">发布时间: {{created_at}}</div>
        </header>
        <div class="content">{{content}}</div>
        <footer class="article-footer">
            <small>最后更新: {{updated_at}}</small>
        </footer>
    </article>
</body>
</html>`;
  }

  /**
   * Render a post to complete HTML page
   */
  async renderToHtml(post: Post): Promise<string> {
    try {
      const template = await this.loadTemplate();
      const htmlContent = this.render(post.content);

      // Format dates
      const createdAt = new Date(post.created_at).toLocaleString('zh-CN');
      const updatedAt = new Date(post.updated_at).toLocaleString('zh-CN');

      // Replace template variables
      const html = template
        .replace(/\{\{title\}\}/g, this.escapeHtml(post.title))
        .replace(/\{\{content\}\}/g, htmlContent)
        .replace(/\{\{created_at\}\}/g, createdAt)
        .replace(/\{\{updated_at\}\}/g, updatedAt);

      logger.debug('Post rendered to HTML', { 
        id: post.id, 
        title: post.title.substring(0, 50),
        contentLength: htmlContent.length 
      });

      return html;
      
    } catch (error) {
      logger.error('Failed to render post to HTML', { error, postId: post.id });
      throw new Error('Failed to render post to HTML');
    }
  }

  /**
   * Escape HTML entities for safe insertion in attributes
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Extract plain text from markdown (for meta descriptions, etc.)
   */
  extractText(markdown: string, maxLength: number = 160): string {
    try {
      const html = this.render(markdown);
      const text = html.replace(/<[^>]*>/g, '').trim();
      
      if (text.length <= maxLength) {
        return text;
      }
      
      return text.substring(0, maxLength).trim() + '...';
      
    } catch (error) {
      logger.error('Failed to extract text from markdown', { error });
      return '';
    }
  }
}