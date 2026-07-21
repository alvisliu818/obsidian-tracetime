# TraceTime

TraceTime 是一个 Obsidian 插件：为笔记中的**每个块**（段落、标题、代码块、列表、表格……）记录并显示"最后编辑时间"，标签统一显示在文档区右侧。

## 特性

- **块级时间追踪**：编辑时通过 CodeMirror ChangeSet 做增量窗口重解析，只处理改动附近的块，不做全文 diff
- **撤销/重做感知**：Ctrl+Z 撤销后内容回到旧版本，时间戳一并恢复（基于内容哈希的会话历史栈）
- **外部修改恢复**：同步软件或其他编辑器改动文件时，按块哈希回迁时间戳
- **可配置的显示规则**：阶梯式规则（刚刚 → N 分钟前 → N 小时前 → 今天 → 昨天 → N 天前 → 今年 → 完整日期），设置页带实时预览
- **时间戳回滚**：每次写入前自动保留上一代备份，误刷后可在设置页一键恢复
- **性能优先**：毫秒级增量路径、视口内渲染、防抖批量落盘、启动不扫描全库

## 数据存储

时间数据保存在 `<库>/.obsidian/plugins/tracetime/records/`，每个 Markdown 文件一条 MessagePack 记录，**不保存笔记正文**（只存块哈希、前后各 32 个标准化字符和时间戳）。

## 安装

### 手动安装

把 `main.js`、`manifest.json`、`styles.css` 复制到 `<库>/.obsidian/plugins/tracetime/`，在设置 → 第三方插件中启用。

### BRAT

安装 BRAT 插件后添加仓库 `QuincySx/obsidian-tracetime`。

## 开发

```
npm install
npm run dev    # watch 构建
npm run build  # 类型检查 + 生产构建
npm test       # 核心逻辑自检测试
npm run pack   # 打包 dist/tracetime-<version>.zip
```

## License

MIT
