#!/bin/bash
# 修复缓存问题

# 1. 创建全新的script文件（确保没有语法错误）
cp script.js.before_auto script-clean.js

# 2. 更新所有HTML文件引用
for file in *.html; do
    if [ -f "$file" ]; then
        sed -i '' 's|script\.js[^"]*|script-clean.js?v='$(date +%s)'|g' "$file"
        echo "更新 $file"
    fi
done

# 3. 创建测试页面
cat > test-clean.html << 'TEST_HTML'
<!DOCTYPE html>
<html>
<head>
    <title>测试页面 - 无缓存版本</title>
    <link rel="stylesheet" href="styles.css?v=$(date +%s)">
</head>
<body>
    <h1>🔄 无缓存测试页面</h1>
    <p>这个页面使用全新的script-clean.js文件，避免缓存问题。</p>
    <button onclick="window.location.href='index.html'">访问主页面</button>
    <script src="script-clean.js?v=$(date +%s)"></script>
</body>
</html>
TEST_HTML

echo "缓存修复完成"
