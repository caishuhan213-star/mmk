#!/bin/bash
# 在script.js中添加自动导入功能

# 找到ScheduleManager类的构造函数位置
LINE_NUM=$(grep -n "class ScheduleManager" script.js | head -1 | cut -d: -f1)

if [ -z "$LINE_NUM" ]; then
    echo "错误：找不到ScheduleManager类"
    exit 1
fi

# 在构造函数后添加自动导入方法
INSERT_LINE=$((LINE_NUM + 10))

# 创建临时文件
cp script.js script.js.tmp

# 在指定位置插入自动导入方法
sed -i '' "${INSERT_LINE} a\\
    // 自动导入数据方法\\
    autoImportData(dataArray) {\\
        console.log('开始自动导入数据，共' + dataArray.length + '条记录');\\
        \\
        let importedCount = 0;\\
        const totalCount = dataArray.length;\\
        \\
        // 逐条导入\\
        const importNext = (index) => {\\
            if (index >= totalCount) {\\
                console.log('✅ 自动导入完成！共导入 ' + importedCount + ' 条记录');\\
                alert('✅ 数据导入完成！共导入 ' + importedCount + ' 条记录');\\
                return;\\
            }\\
            \\
            const data = dataArray[index];\\
            console.log('导入第 ' + (index + 1) + '/' + totalCount + ' 条：', data.employeeName, data.startTime + '-' + data.endTime);\\
            \\
            // 设置表单数据\\
            document.getElementById('employeeName').value = data.employeeName || '';\\
            document.getElementById('scheduleDate').value = data.scheduleDate || '';\\
            document.getElementById('startTime').value = data.startTime || '';\\
            document.getElementById('endTime').value = data.endTime || '';\\
            document.getElementById('projectName').value = data.projectName || '';\\
            document.getElementById('price').value = data.price || '';\\
            document.getElementById('notes').value = data.notes || '';\\
            \\
            // 延迟执行以确保表单更新\\
            setTimeout(() => {\\
                // 触发添加按钮\\
                const addBtn = document.getElementById('addScheduleBtn');\\
                if (addBtn) {\\
                    addBtn.click();\\
                    importedCount++;\\
                }\\
                \\
                // 导入下一条\\
                setTimeout(() => importNext(index + 1), 800);\\
            }, 500);\\
        };\\
        \\
        // 开始导入\\
        importNext(0);\\
    }\\
" script.js.tmp

# 在页面加载完成后添加自动导入调用
echo "// 页面加载完成后自动导入数据
document.addEventListener('DOMContentLoaded', function() {
    // 等待scheduleManager初始化
    setTimeout(function() {
        if (typeof scheduleManager !== 'undefined') {
            console.log('scheduleManager已就绪，准备自动导入数据...');
            
            // 3月2日番禺店数据
            const march2Data = [
                {
                    employeeName: '小莹',
                    scheduleDate: '2026-03-02',
                    startTime: '19:00',
                    endTime: '20:00',
                    projectName: 'SSS',
                    price: '260',
                    notes: '文爷（300半价卷后），微信群',
                    storeId: 'panyu'
                },
                {
                    employeeName: '小莹',
                    scheduleDate: '2026-03-02',
                    startTime: '20:00',
                    endTime: '21:00',
                    projectName: 'SSS',
                    price: '260',
                    notes: '老九（458），微信群',
                    storeId: 'panyu'
                },
                {
                    employeeName: '小莹',
                    scheduleDate: '2026-03-02',
                    startTime: '21:00',
                    endTime: '22:00',
                    projectName: 'SSS',
                    price: '260',
                    notes: '牛角包（279），微信群',
                    storeId: 'panyu'
                },
                {
                    employeeName: '小莹',
                    scheduleDate: '2026-03-02',
                    startTime: '23:00',
                    endTime: '24:00',
                    projectName: 'SSS',
                    price: '260',
                    notes: '蛋蛋（558），微信群',
                    storeId: 'panyu'
                }
            ];
            
            // 检查是否已经有数据，避免重复导入
            const existingSchedules = scheduleManager.schedules || [];
            if (existingSchedules.length === 0) {
                console.log('开始自动导入3月2日数据...');
                scheduleManager.autoImportData(march2Data);
            } else {
                console.log('已有数据，跳过自动导入');
            }
        } else {
            console.warn('scheduleManager未初始化，无法自动导入数据');
        }
    }, 2000); // 等待2秒确保页面完全加载
});" >> script.js.tmp

# 替换原文件
mv script.js.tmp script.js

echo "自动导入功能添加完成"
