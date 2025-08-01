# 客户端 API 文档

本文档详細描述了 Obsidian Publishing System 客户端插件的 API、核心功能和使用指南。

## 📋 概述

Obsidian 客户端插件是 Obsidian Publishing System 的用户界面，允许用户直接从 Obsidian 编辑器发布、更新和管理笔记。插件采用 TypeScript 开发，使用 esbuild 进行构建。

## 🏗️ 插件架构

### 核心组件

```typescript
// 插件主类
class ObsiusPlugin extends Plugin {
    settings: PluginData;
    apiClient: ObsiusClient;
    settingsTab: ObsiusSettingTab;
    
    async onload(): Promise<void> {
        // 插件初始化逻辑
    }
    
    onunload(): void {
        // 清理资源
    }
}
```

### 文件结构

```
client/
├── main.ts              # 插件入口点
├── src/
│   ├── obsius.ts        # 核心 API 客户端
│   ├── http.ts          # HTTP 客户端包装器
│   ├── modals.ts        # UI 组件和对话框
│   └── types.ts         # 本地类型定义
├── manifest.json        # 插件元数据
├── styles.css          # 样式文件
└── esbuild.config.mjs  # 构建配置
```

## 🔌 核心 API

### ObsiusClient 类

核心 API 客户端类，处理与服务器的所有通信。

```typescript
class ObsiusClient {
    constructor(
        private serverUrl: string,
        private authToken?: string
    ) {}
    
    // 发布新笔记
    async publishPost(title: string, content: string): Promise<CreatePostResponse>;
    
    // 更新已发布笔记
    async updatePost(id: string, secret: string, title: string, content: string): Promise<void>;
    
    // 删除已发布笔记
    async deletePost(id: string, secret: string): Promise<void>;
    
    // 获取已发布笔记
    async getPost(id: string): Promise<Post>;
    
    // 健康检查
    async healthCheck(): Promise<HealthResponse>;
}
```

#### publishPost()

发布新笔记到服务器。

```typescript
async publishPost(title: string, content: string): Promise<CreatePostResponse> {
    const response = await this.httpClient.post('/', {
        title,
        content
    });
    
    return {
        id: response.id,
        secret: response.secret,
        url: response.url
    };
}
```

**参数:**
- `title: string` - 笔记标题
- `content: string` - Markdown 内容

**返回值:**
```typescript
interface CreatePostResponse {
    id: string;      // 8字符公共ID
    secret: string;  // UUID 密钥
    url: string;     // 完整公共URL
}
```

**错误处理:**
- `400 Bad Request` - 请求格式错误
- `500 Internal Server Error` - 服务器错误
- `NetworkError` - 网络连接失败

#### updatePost()

更新已发布的笔记内容。

```typescript
async updatePost(
    id: string, 
    secret: string, 
    title: string, 
    content: string
): Promise<void> {
    await this.httpClient.put(`/${id}`, {
        title,
        content
    }, {
        headers: {
            'Authorization': `Bearer ${secret}`
        }
    });
}
```

**参数:**
- `id: string` - 帖子ID
- `secret: string` - 认证密钥
- `title: string` - 新标题
- `content: string` - 新内容

**错误处理:**
- `401 Unauthorized` - 密钥无效
- `404 Not Found` - 帖子不存在
- `400 Bad Request` - 请求格式错误

#### deletePost()

删除已发布的笔记。

```typescript
async deletePost(id: string, secret: string): Promise<void> {
    await this.httpClient.delete(`/${id}`, {
        headers: {
            'Authorization': `Bearer ${secret}`
        }
    });
}
```

**参数:**
- `id: string` - 帖子ID
- `secret: string` - 认证密钥

**错误处理:**
- `401 Unauthorized` - 密钥无效
- `404 Not Found` - 帖子不存在

### HTTPClient 类

HTTP 请求包装器，提供错误处理和重试逻辑。

```typescript
class HTTPClient {
    constructor(private baseUrl: string) {}
    
    async get(path: string, options?: RequestOptions): Promise<any>;
    async post(path: string, data: any, options?: RequestOptions): Promise<any>;
    async put(path: string, data: any, options?: RequestOptions): Promise<any>;
    async delete(path: string, options?: RequestOptions): Promise<any>;
}
```

**特性:**
- 自动 JSON 解析
- 内容类型验证
- 网络错误重试
- 统一错误处理

## 🎛️ 用户界面

### 命令面板集成

插件注册以下命令到 Obsidian 命令面板：

```typescript
// 命令注册
this.addCommand({
    id: 'publish-current-note',
    name: '发布当前笔记',
    callback: () => this.publishCurrentNote()
});

this.addCommand({
    id: 'update-published-note',
    name: '更新已发布笔记',
    callback: () => this.updateCurrentNote()
});

this.addCommand({
    id: 'delete-published-note',
    name: '删除已发布笔记',
    callback: () => this.deleteCurrentNote()
});

this.addCommand({
    id: 'copy-obsidian-url',
    name: '复制 Obsius URL',
    callback: () => this.copyPublicUrl()
});

this.addCommand({
    id: 'view-all-published-posts',
    name: '查看所有已发布帖子',
    callback: () => this.viewAllPosts()
});
```

### 上下文菜单集成

```typescript
// 文件浏览器右键菜单
this.registerEvent(
    this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
            menu.addItem((item) => {
                item
                    .setTitle('发布到 Obsius')
                    .setIcon('upload')
                    .onClick(() => this.publishFile(file));
            });
        }
    })
);

// 编辑器右键菜单  
this.registerEvent(
    this.app.workspace.on('editor-menu', (menu, editor, view) => {
        menu.addItem((item) => {
            item
                .setTitle('发布当前笔记')
                .setIcon('upload')
                .onClick(() => this.publishCurrentNote());
        });
    })
);
```

### 模态对话框

#### 发布确认对话框

```typescript
class PublishConfirmModal extends Modal {
    constructor(
        app: App, 
        private title: string,
        private onConfirm: () => void
    ) {
        super(app);
    }
    
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: '确认发布' });
        contentEl.createEl('p', { text: `确定要发布 "${this.title}" 吗？` });
        
        const buttonContainer = contentEl.createDiv();
        
        const confirmBtn = buttonContainer.createEl('button', {
            text: '发布',
            cls: 'mod-cta'
        });
        confirmBtn.onclick = () => {
            this.onConfirm();
            this.close();
        };
        
        const cancelBtn = buttonContainer.createEl('button', {
            text: '取消'
        });
        cancelBtn.onclick = () => this.close();
    }
}
```

#### 帖子管理对话框

```typescript
class PostManagementModal extends Modal {
    constructor(
        app: App,
        private posts: PostMetadata[],
        private onAction: (action: string, post: PostMetadata) => void
    ) {
        super(app);
    }
    
    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: '已发布的帖子' });
        
        if (this.posts.length === 0) {
            contentEl.createEl('p', { text: '没有已发布的帖子' });
            return;
        }
        
        const postList = contentEl.createDiv({ cls: 'post-list' });
        
        this.posts.forEach(post => {
            const postItem = postList.createDiv({ cls: 'post-item' });
            
            postItem.createEl('h3', { text: post.title });
            postItem.createEl('p', { 
                text: `发布时间: ${new Date(post.publishedAt).toLocaleString()}`
            });
            postItem.createEl('p', {
                text: `URL: ${post.url}`
            });
            
            const actions = postItem.createDiv({ cls: 'post-actions' });
            
            actions.createEl('button', { text: '复制链接' })
                .onclick = () => navigator.clipboard.writeText(post.url);
                
            actions.createEl('button', { text: '更新' })
                .onclick = () => this.onAction('update', post);
                
            actions.createEl('button', { text: '删除', cls: 'mod-warning' })
                .onclick = () => this.onAction('delete', post);
        });
    }
}
```

## ⚙️ 配置管理

### 设置数据模型

```typescript
interface PluginData {
    serverUrl: string;           // 服务器URL
    authToken?: string;          // 可选认证令牌
    posts: PostMetadata[];       // 已发布帖子元数据
}

interface PostMetadata {
    id: string;                  // 帖子ID
    secret: string;              // 认证密钥
    title: string;               // 标题
    filePath: string;            // 本地文件路径
    url: string;                 // 公共URL
    publishedAt: string;         // 发布时间
    updatedAt?: string;          // 更新时间
}
```

### 设置界面

```typescript
class ObsiusSettingTab extends PluginSettingTab {
    constructor(app: App, plugin: ObsiusPlugin) {
        super(app, plugin);
    }
    
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        // 服务器URL设置
        new Setting(containerEl)
            .setName('服务器 URL')
            .setDesc('Obsius 服务器的完整 URL')
            .addText(text => text
                .setPlaceholder('https://your-domain.com')
                .setValue(this.plugin.settings.serverUrl)
                .onChange(async (value) => {
                    this.plugin.settings.serverUrl = value;
                    await this.plugin.saveSettings();
                })
            );
            
        // 认证令牌设置
        new Setting(containerEl)
            .setName('认证令牌')
            .setDesc('可选：私有部署的认证令牌')
            .addText(text => text
                .setPlaceholder('可选')
                .setValue(this.plugin.settings.authToken || '')
                .onChange(async (value) => {
                    this.plugin.settings.authToken = value || undefined;
                    await this.plugin.saveSettings();
                })
            );
            
        // 连接测试按钮
        new Setting(containerEl)
            .setName('连接测试')
            .setDesc('测试与服务器的连接')
            .addButton(button => button
                .setButtonText('测试连接')
                .onClick(async () => {
                    await this.testConnection();
                })
            );
    }
    
    private async testConnection(): Promise<void> {
        try {
            await this.plugin.apiClient.healthCheck();
            new Notice('连接成功！');
        } catch (error) {
            new Notice(`连接失败: ${error.message}`);
        }
    }
}
```

### 数据持久化

```typescript
// 加载设置
async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

// 保存设置
async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
}

// 默认设置
const DEFAULT_SETTINGS: PluginData = {
    serverUrl: 'https://share.141029.xyz',
    posts: []
};
```

## 🔄 工作流程

### 发布笔记流程

```typescript
async publishCurrentNote(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile || activeFile.extension !== 'md') {
        new Notice('请打开一个 Markdown 文件');
        return;
    }
    
    // 检查是否已发布
    const existingPost = this.findPostByPath(activeFile.path);
    if (existingPost) {
        // 显示更新选项
        await this.showUpdateConfirmation(existingPost);
        return;
    }
    
    // 读取文件内容
    const content = await this.app.vault.read(activeFile);
    const title = activeFile.basename;
    
    // 显示发布确认
    new PublishConfirmModal(this.app, title, async () => {
        try {
            const response = await this.apiClient.publishPost(title, content);
            
            // 保存元数据
            const postMetadata: PostMetadata = {
                id: response.id,
                secret: response.secret,
                title: title,
                filePath: activeFile.path,
                url: response.url,
                publishedAt: new Date().toISOString()
            };
            
            this.settings.posts.push(postMetadata);
            await this.saveSettings();
            
            // 显示成功通知
            new Notice(`发布成功！URL: ${response.url}`);
            
            // 复制URL到剪贴板
            await navigator.clipboard.writeText(response.url);
            
        } catch (error) {
            new Notice(`发布失败: ${error.message}`);
        }
    }).open();
}
```

### 更新笔记流程

```typescript
async updateCurrentNote(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice('请打开一个文件');
        return;
    }
    
    const postMetadata = this.findPostByPath(activeFile.path);
    if (!postMetadata) {
        new Notice('此笔记尚未发布');
        return;
    }
    
    const content = await this.app.vault.read(activeFile);
    const title = activeFile.basename;
    
    try {
        await this.apiClient.updatePost(
            postMetadata.id,
            postMetadata.secret,
            title,
            content
        );
        
        // 更新元数据
        postMetadata.title = title;
        postMetadata.updatedAt = new Date().toISOString();
        await this.saveSettings();
        
        new Notice('更新成功！');
        
    } catch (error) {
        new Notice(`更新失败: ${error.message}`);
    }
}
```

### 删除笔记流程

```typescript
async deleteCurrentNote(): Promise<void> {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice('请打开一个文件');
        return;
    }
    
    const postMetadata = this.findPostByPath(activeFile.path);
    if (!postMetadata) {
        new Notice('此笔记尚未发布');
        return;
    }
    
    // 确认删除
    const confirmed = await this.showDeleteConfirmation(postMetadata.title);
    if (!confirmed) return;
    
    try {
        await this.apiClient.deletePost(postMetadata.id, postMetadata.secret);
        
        // 从本地移除元数据
        this.settings.posts = this.settings.posts.filter(
            post => post.id !== postMetadata.id
        );
        await this.saveSettings();
        
        new Notice('删除成功！');
        
    } catch (error) {
        new Notice(`删除失败: ${error.message}`);
    }
}
```

## 🚀 插件安装和部署

### 方式一：从GitHub Release安装（推荐）

1. **下载最新Release**
   - 访问 [GitHub Releases](https://github.com/ilovethw3/publish-obsidian-plugin/releases)
   - 下载最新版本的 `obsidian-publishing-system.zip`

2. **安装到Obsidian**
   ```bash
   # 解压到Obsidian插件目录
   unzip obsidian-publishing-system.zip -d ~/.config/obsidian/plugins/obsidian-publishing-system/
   
   # 或者手动创建目录并复制文件
   mkdir -p ~/.config/obsidian/plugins/obsidian-publishing-system/
   cp main.js manifest.json styles.css ~/.config/obsidian/plugins/obsidian-publishing-system/
   ```

3. **启用插件**
   - 重启Obsidian
   - 进入 设置 → 第三方插件
   - 找到 "Obsidian Publishing System" 并启用
   - 配置服务器URL等设置

### 方式二：手动安装

1. **创建插件目录**
   ```bash
   # Linux/Mac
   mkdir -p ~/.config/obsidian/plugins/obsidian-publishing-system/
   
   # Windows
   mkdir "%APPDATA%\obsidian\plugins\obsidian-publishing-system"
   ```

2. **复制必需文件**
   ```bash
   # 从项目根目录复制构建文件
   cp main.js manifest.json styles.css ~/.config/obsidian/plugins/obsidian-publishing-system/
   ```

3. **重启Obsidian并启用插件**

### 方式三：开发者模式安装

如果你想从源码构建和安装：

1. **克隆仓库**
   ```bash
   git clone https://github.com/ilovethw3/publish-obsidian-plugin.git
   cd publish-obsidian-plugin
   ```

2. **构建客户端**
   ```bash
   cd client
   npm install
   npm run build
   ```

3. **创建软链接（推荐开发用）**
   ```bash
   # 创建软链接到Obsidian插件目录
   ln -sf "$(pwd)" ~/.config/obsidian/plugins/obsidian-publishing-system
   ```

   或者复制文件：
   ```bash
   # 复制构建文件到插件目录
   mkdir -p ~/.config/obsidian/plugins/obsidian-publishing-system/
   cp ../main.js ../manifest.json ../styles.css ~/.config/obsidian/plugins/obsidian-publishing-system/
   ```

### 插件配置

安装完成后，需要配置插件：

1. **基本设置**
   - 打开 Obsidian 设置
   - 进入 插件选项 → Obsidian Publishing System
   - 配置以下选项：

   ```
   服务器URL: https://your-domain.com
   认证令牌: (可选，私有部署时使用)
   ```

2. **测试连接**
   - 点击 "测试连接" 按钮
   - 确保能够成功连接到服务器

3. **验证安装**
   - 打开命令面板 (Ctrl/Cmd + P)
   - 搜索 "Publish current note"
   - 如果能看到相关命令，说明安装成功

### 插件文件结构

安装完成后，插件目录应包含：

```
~/.config/obsidian/plugins/obsidian-publishing-system/
├── main.js          # 插件主代码（必需）
├── manifest.json    # 插件元数据（必需）
├── styles.css       # 插件样式（必需）
└── data.json        # 插件数据（自动生成）
```

## 🛠️ 开发和构建

### 开发环境设置

```bash
# 进入客户端目录
cd client

# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 生产构建
npm run build
```

### 构建配置

```javascript
// esbuild.config.mjs
import esbuild from 'esbuild';

const prod = process.argv[2] === 'production';

esbuild.build({
    entryPoints: ['main.ts'],
    bundle: true,
    external: ['obsidian', 'electron', '@codemirror/*'],
    format: 'cjs',
    watch: !prod,
    target: 'es2018',
    logLevel: 'info',
    sourcemap: prod ? false : 'inline',
    treeShaking: true,
    outdir: '../',
    minify: prod
}).catch(() => process.exit(1));
```

### 开发调试

```bash
# 开发时的实时构建
cd client
npm run dev

# 查看构建输出
ls -la ../main.js ../manifest.json ../styles.css

# 重新加载Obsidian插件
# 在Obsidian中：设置 → 第三方插件 → 刷新 → 重新启用插件
```

## 🔒 安全考虑

### 数据保护

1. **本地存储安全**
   - 认证密钥存储在 Obsidian 数据目录
   - 不在版本控制中提交敏感数据
   - 定期清理无效的帖子元数据

2. **网络通信安全**
   - 强制 HTTPS 通信
   - 验证服务器证书
   - 安全的 Bearer Token 传输

3. **输入验证**
   - 标题和内容长度限制
   - 特殊字符过滤
   - URL 格式验证

### 错误处理最佳实践

```typescript
class ErrorHandler {
    static handle(error: unknown, context: string): void {
        console.error(`[Obsius] ${context}:`, error);
        
        if (error instanceof NetworkError) {
            new Notice('网络连接失败，请检查网络设置');
        } else if (error instanceof AuthError) {
            new Notice('认证失败，请检查服务器配置');
        } else if (error instanceof ValidationError) {
            new Notice(`输入验证失败: ${error.message}`);
        } else {
            new Notice('操作失败，请查看控制台获取详细信息');
        }
    }
}
```

## 📊 性能优化

### 缓存策略

```typescript
class PostCache {
    private cache = new Map<string, PostMetadata>();
    
    get(filePath: string): PostMetadata | undefined {
        return this.cache.get(filePath);
    }
    
    set(filePath: string, post: PostMetadata): void {
        this.cache.set(filePath, post);
    }
    
    invalidate(filePath: string): void {
        this.cache.delete(filePath);
    }
    
    clear(): void {
        this.cache.clear();
    }
}
```

### 异步操作优化

```typescript
// 批量操作
async publishMultipleNotes(files: TFile[]): Promise<void> {
    const publishPromises = files.map(file => this.publishFile(file));
    
    try {
        await Promise.allSettled(publishPromises);
        new Notice(`批量发布完成`);
    } catch (error) {
        new Notice('批量发布部分失败');
    }
}

// 请求去重
private readonly pendingRequests = new Map<string, Promise<any>>();

async dedupedRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
        return this.pendingRequests.get(key) as Promise<T>;
    }
    
    const promise = requestFn();
    this.pendingRequests.set(key, promise);
    
    try {
        const result = await promise;
        return result;
    } finally {
        this.pendingRequests.delete(key);
    }
}
```

## 🧪 测试策略

### 单元测试示例

```typescript
// 测试 API 客户端
describe('ObsiusClient', () => {
    let client: ObsiusClient;
    let mockHttp: HTTPClient;
    
    beforeEach(() => {
        mockHttp = jest.mocked(new HTTPClient(''));
        client = new ObsiusClient('https://test.com');
    });
    
    test('publishPost should return post metadata', async () => {
        const mockResponse = {
            id: 'test123',
            secret: 'uuid-secret',
            url: 'https://test.com/test123'
        };
        
        mockHttp.post.mockResolvedValue(mockResponse);
        
        const result = await client.publishPost('Test Title', 'Test Content');
        
        expect(result).toEqual(mockResponse);
        expect(mockHttp.post).toHaveBeenCalledWith('/', {
            title: 'Test Title',
            content: 'Test Content'
        });
    });
});
```

---

> 📝 **注意**: 本文档基于 DeepWiki 分析和代码库检查生成，提供了完整的客户端 API 参考。如有问题请参考源代码或提交 Issue。