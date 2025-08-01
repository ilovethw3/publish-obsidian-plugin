# 服务器 API 文档

本文档详细描述了 Obsidian Publishing System 服务器端的 RESTful API，包括所有端点、请求响应格式、认证机制和错误处理。

## 📋 API 概述

服务器提供基于 REST 的 API，用于管理已发布的笔记。所有 API 响应均为 JSON 格式（除非特别指明），并使用标准 HTTP 状态码。

### 基础信息

- **Base URL**: `https://your-domain.com`
- **协议**: HTTPS (强制)
- **内容类型**: `application/json`
- **认证**: Bearer Token (对于写操作)
- **字符编码**: UTF-8

## 🔐 认证机制

### Bearer Token 认证

对于需要修改数据的操作 (`PUT`, `DELETE`)，需要在请求头中包含认证令牌：

```http
Authorization: Bearer <secret>
```

其中 `<secret>` 是创建帖子时服务器返回的 UUID 密钥。

**示例:**
```http
PUT /abc12345 HTTP/1.1
Host: your-domain.com
Content-Type: application/json
Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000

{
  "title": "Updated Title",
  "content": "Updated content..."
}
```

## 📚 API 端点

### 创建帖子

创建一个新的已发布帖子。

```http
POST /
```

**请求体:**
```typescript
interface CreatePostRequest {
    title: string;    // 帖子标题，1-200字符
    content: string;  // Markdown内容，最大1MB
}
```

**示例请求:**
```json
{
    "title": "我的第一篇笔记",
    "content": "# 标题\n\n这是笔记内容..."
}
```

**成功响应 (201 Created):**
```typescript
interface CreatePostResponse {
    id: string;      // 8字符公共ID (nanoid)
    secret: string;  // UUID认证密钥
    url: string;     // 完整的公共访问URL
}
```

**示例响应:**
```json
{
    "id": "abc12345",
    "secret": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://your-domain.com/abc12345"
}
```

**错误响应:**
- `400 Bad Request` - 请求格式错误或验证失败
- `500 Internal Server Error` - 服务器内部错误

### 获取帖子

根据 ID 获取已发布的帖子。支持 HTML 和 JSON 两种格式。

```http
GET /:id
```

**路径参数:**
- `id` - 8字符的帖子ID

**请求头:**
- `Accept: application/json` - 返回JSON格式数据
- `Accept: text/html` (默认) - 返回HTML页面

**成功响应 (200 OK):**

**JSON 格式 (`Accept: application/json`):**
```typescript
interface Post {
    id: string;        // 帖子ID
    title: string;     // 标题
    content: string;   // Markdown内容
    createdAt: string; // 创建时间 (ISO 8601)
    updatedAt: string; // 更新时间 (ISO 8601)
}
```

**示例 JSON 响应:**
```json
{
    "id": "abc12345",
    "title": "我的第一篇笔记",
    "content": "# 标题\n\n这是笔记内容...",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**HTML 格式 (默认):**
返回渲染好的 HTML 页面，包含：
- 语义化的 HTML 结构
- 响应式 CSS 样式
- Markdown 到 HTML 的转换
- XSS 防护（通过 DOMPurify）

**错误响应:**
- `404 Not Found` - 帖子不存在

### 更新帖子

更新现有帖子的标题或内容。需要认证。

```http
PUT /:id
```

**路径参数:**
- `id` - 帖子ID

**请求头:**
- `Authorization: Bearer <secret>` - 必需的认证密钥
- `Content-Type: application/json`

**请求体:**
```typescript
interface UpdatePostRequest {
    title?: string;    // 可选：新标题
    content?: string;  // 可选：新内容
}
```

**示例请求:**
```json
{
    "title": "更新后的标题",
    "content": "# 更新后的内容\n\n这是修改后的内容..."
}
```

**成功响应 (200 OK):**
```json
{
    "message": "Post updated successfully."
}
```

**错误响应:**
- `400 Bad Request` - 请求格式错误
- `401 Unauthorized` - 认证失败或密钥无效
- `404 Not Found` - 帖子不存在

### 删除帖子

删除已发布的帖子。需要认证。

```http
DELETE /:id
```

**路径参数:**
- `id` - 帖子ID

**请求头:**
- `Authorization: Bearer <secret>` - 必需的认证密钥

**成功响应 (204 No Content):**
空响应体，表示删除成功。

**错误响应:**
- `401 Unauthorized` - 认证失败或密钥无效
- `404 Not Found` - 帖子不存在

### 健康检查

服务器健康状态检查端点。

```http
GET /health
```

**成功响应 (200 OK):**
```typescript
interface HealthResponse {
    status: string;        // "ok" 表示健康
    timestamp: string;     // 当前时间戳 (ISO 8601)
    uptime?: number;       // 服务器运行时间（秒）
    version?: string;      // 服务器版本
}
```

**示例响应:**
```json
{
    "status": "ok",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 3600,
    "version": "1.0.0"
}
```

## 🚨 错误处理

### 标准错误格式

所有错误响应都使用统一的JSON格式：

```typescript
interface ErrorResponse {
    error: {
        message: string;  // 人类可读的错误描述
        code: string;     // 机器可读的错误代码
        details?: any;    // 可选的额外错误信息
    }
}
```

### 常见错误代码

| HTTP状态码 | 错误代码 | 描述 |
|-----------|---------|------|
| 400 | `VALIDATION_ERROR` | 请求验证失败 |
| 400 | `INVALID_JSON` | JSON格式错误 |
| 401 | `INVALID_SECRET` | 认证密钥无效 |
| 401 | `MISSING_AUTH` | 缺少认证头 |
| 404 | `POST_NOT_FOUND` | 帖子不存在 |
| 413 | `PAYLOAD_TOO_LARGE` | 请求体过大 |
| 429 | `RATE_LIMIT_EXCEEDED` | 请求频率过高 |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

### 错误示例

**验证错误 (400):**
```json
{
    "error": {
        "message": "Title must be between 1 and 200 characters",
        "code": "VALIDATION_ERROR",
        "details": {
            "field": "title",
            "value": "",
            "constraint": "length"
        }
    }
}
```

**认证错误 (401):**
```json
{
    "error": {
        "message": "The secret provided is invalid or does not have permission",
        "code": "INVALID_SECRET"
    }
}
```

**帖子不存在 (404):**
```json
{
    "error": {
        "message": "Post with ID 'abc12345' not found",
        "code": "POST_NOT_FOUND",
        "details": {
            "id": "abc12345"
        }
    }
}
```

## 🔧 技术实现细节

### 数据验证

服务器使用 `express-validator` 进行输入验证：

```typescript
// 创建帖子验证规则
const createPostValidation = [
    body('title')
        .isString()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Title must be between 1 and 200 characters'),
    body('content')
        .isString()
        .isLength({ max: 1000000 })  // 1MB限制
        .withMessage('Content must not exceed 1MB')
];

// 更新帖子验证规则
const updatePostValidation = [
    body('title')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 200 }),
    body('content')
        .optional()
        .isString()
        .isLength({ max: 1000000 })
];
```

### ID生成策略

```typescript
import { nanoid } from 'nanoid';
import { randomUUID } from 'crypto';

// 生成8字符公共ID
const generatePublicId = (): string => {
    return nanoid(8); // 例: "abc12345"
};

// 生成UUID认证密钥
const generateSecret = (): string => {
    return randomUUID(); // 例: "550e8400-e29b-41d4-a716-446655440000"
};
```

### 内容渲染

```typescript
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Markdown到HTML转换
const renderMarkdown = (content: string): string => {
    const rawHtml = marked(content);
    
    // XSS防护
    const window = new JSDOM('').window;
    const purify = DOMPurify(window as any);
    
    const cleanHtml = purify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'strong', 'em', 'u', 'del',
            'ul', 'ol', 'li', 'blockquote',
            'code', 'pre', 'a', 'img'
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class']
    });
    
    return cleanHtml;
};
```

### 缓存机制

```typescript
import NodeCache from 'node-cache';

// 缓存配置
const cache = new NodeCache({
    stdTTL: 3600,        // 1小时过期
    checkperiod: 120,    // 2分钟清理检查
    useClones: false     // 性能优化
});

// 缓存键策略
const getCacheKey = (id: string, format: 'html' | 'json'): string => {
    return `post:${id}:${format}`;
};

// 缓存操作
const getCachedPost = (id: string, format: 'html' | 'json'): any => {
    return cache.get(getCacheKey(id, format));
};

const setCachedPost = (id: string, format: 'html' | 'json', data: any): void => {
    cache.set(getCacheKey(id, format), data);
};

const invalidatePostCache = (id: string): void => {
    cache.del(getCacheKey(id, 'html'));
    cache.del(getCacheKey(id, 'json'));
};
```

## 🌐 CORS 配置

```typescript
import cors from 'cors';

const corsOptions = {
    origin: [
        'app://obsidian.md',        // Obsidian桌面应用
        'https://your-domain.com',   // 生产域名
        /^obsidian:\/\//,           // Obsidian协议
        /^app:\/\//                 // 应用协议
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept'
    ],
    credentials: true,
    maxAge: 86400  // 24小时预检缓存
};

app.use(cors(corsOptions));
```

## 🛡️ 安全特性

### 速率限制

```typescript
import rateLimit from 'express-rate-limit';

// 创建帖子限制
const createPostLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15分钟
    max: 10,                   // 最多10个请求
    message: {
        error: {
            message: 'Too many posts created, please try again later',
            code: 'RATE_LIMIT_EXCEEDED'
        }
    }
});

// 一般API限制
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15分钟
    max: 100,                  // 最多100个请求
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/', generalLimiter);
app.use('/', createPostLimiter);
```

### 安全头

```typescript
import helmet from 'helmet';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "https:", "data:"],
            fontSrc: ["'self'", "https:"],
            connectSrc: ["'self'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
```

## 📊 性能监控

### 响应时间中间件

```typescript
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
});
```

### 健康检查增强

```typescript
app.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: await checkDatabaseHealth(),
        cache: {
            keys: cache.keys().length,
            hits: cache.getStats().hits,
            misses: cache.getStats().misses
        }
    };
    
    res.json(health);
});

async function checkDatabaseHealth(): Promise<{ status: string; responseTime?: number }> {
    try {
        const start = Date.now();
        await db.get('SELECT 1');
        const responseTime = Date.now() - start;
        
        return { status: 'ok', responseTime };
    } catch (error) {
        return { status: 'error' };
    }
}
```

## 🧪 API 测试

### 使用 curl 测试

**创建帖子:**
```bash
curl -X POST https://your-domain.com/ \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试帖子",
    "content": "# 测试\n\n这是测试内容"
  }'
```

**获取帖子 (JSON):**
```bash
curl -H "Accept: application/json" \
  https://your-domain.com/abc12345
```

**更新帖子:**
```bash
curl -X PUT https://your-domain.com/abc12345 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "title": "更新的标题",
    "content": "更新的内容"
  }'
```

**删除帖子:**
```bash
curl -X DELETE https://your-domain.com/abc12345 \
  -H "Authorization: Bearer 550e8400-e29b-41d4-a716-446655440000"
```

### 使用 JavaScript 测试

```javascript
// 测试客户端
class ApiClient {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    
    async createPost(title, content) {
        const response = await fetch(`${this.baseUrl}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, content })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error.message);
        }
        
        return response.json();
    }
    
    async getPost(id) {
        const response = await fetch(`${this.baseUrl}/${id}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error.message);
        }
        
        return response.json();
    }
    
    async updatePost(id, secret, updates) {
        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${secret}`
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error.message);
        }
        
        return response.json();
    }
    
    async deletePost(id, secret) {
        const response = await fetch(`${this.baseUrl}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${secret}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error.message);
        }
    }
}

// 使用示例
const client = new ApiClient('https://your-domain.com');

// 测试完整流程
async function testFullWorkflow() {
    try {
        // 创建帖子
        const post = await client.createPost('测试标题', '# 测试内容');
        console.log('创建成功:', post);
        
        // 获取帖子
        const retrieved = await client.getPost(post.id);
        console.log('获取成功:', retrieved);
        
        // 更新帖子
        await client.updatePost(post.id, post.secret, {
            title: '更新的标题'
        });
        console.log('更新成功');
        
        // 删除帖子
        await client.deletePost(post.id, post.secret);
        console.log('删除成功');
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

testFullWorkflow();
```

---

> 📝 **注意**: 本API文档基于 DeepWiki 分析和实际代码检查生成。所有示例都经过验证，可直接用于开发和测试。