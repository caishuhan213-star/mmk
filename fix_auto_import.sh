#!/bin/bash
# 修复autoImportData方法的位置

# 找到autoImportData方法的开始和结束
START_LINE=$(grep -n "autoImportData(dataArray)" script.js | head -1 | cut -d: -f1)
if [ -z "$START_LINE" ]; then
    echo "错误：找不到autoImportData方法"
    exit 1
fi

# 找到方法的结束（查找匹配的}）
LINE_COUNT=$(wc -l < script.js)
END_LINE=$START_LINE
BRACE_COUNT=0
IN_METHOD=false

for ((i=START_LINE; i<=LINE_COUNT; i++)); do
    LINE_CONTENT=$(sed -n "${i}p" script.js)
    
    if [[ $LINE_CONTENT == *"autoImportData(dataArray)"* ]]; then
        IN_METHOD=true
    fi
    
    if [ "$IN_METHOD" = true ]; then
        # 统计大括号
        OPEN_BRACES=$(echo "$LINE_CONTENT" | grep -o "{" | wc -l)
        CLOSE_BRACES=$(echo "$LINE_CONTENT" | grep -o "}" | wc -l)
        BRACE_COUNT=$((BRACE_COUNT + OPEN_BRACES - CLOSE_BRACES))
        
        if [ $BRACE_COUNT -eq 0 ] && [ $i -gt $START_LINE ]; then
            END_LINE=$i
            break
        fi
    fi
done

echo "方法从第 $START_LINE 行到第 $END_LINE 行"

# 提取方法内容
sed -n "${START_LINE},${END_LINE}p" script.js > method_content.txt

# 删除原方法
sed -i '' "${START_LINE},${END_LINE}d" script.js

# 找到类的结束位置（最后一个}）
CLASS_END=$(grep -n "^}" script.js | tail -1 | cut -d: -f1)

# 在类结束前插入方法
sed -i '' "${CLASS_END} i\\
$(cat method_content.txt)" script.js

# 清理
rm method_content.txt

echo "方法位置修复完成"
