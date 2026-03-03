// 多店铺管理中心 JavaScript

class StoreCenterManager {
    constructor() {
        this.stores = this.loadStores();
        this.editingStoreId = null;
        this.init();
    }

    // 初始化
    init() {
        this.renderStoreGrid();
        this.updateOverviewStats();
    }

    // 加载店铺列表
    loadStores() {
        const data = localStorage.getItem('stores');
        return data ? JSON.parse(data) : [];
    }

    // 保存店铺列表
    saveStores() {
        localStorage.setItem('stores', JSON.stringify(this.stores));
    }

    // 渲染店铺网格
    renderStoreGrid() {
        const grid = document.getElementById('storeGrid');
        
        if (this.stores.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🏪</div>
                    <h3>还没有店铺</h3>
                    <p>点击"添加新店铺"按钮创建您的第一家店铺</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.stores.map(store => {
            const stats = this.getStoreStats(store.id);
            return `
                <div class="store-card" onclick="storeCenter.enterStore('${store.id}')">
                    <div class="store-card-header">
                        <div style="display: flex; align-items: center; flex: 1;">
                            <span class="store-card-icon">🏪</span>
                            <span class="store-card-name">${store.name}</span>
                        </div>
                        <div class="store-card-actions" onclick="event.stopPropagation()">
                            <button onclick="storeCenter.editStore('${store.id}')" title="编辑">✏️</button>
                            <button onclick="storeCenter.deleteStore('${store.id}')" title="删除">🗑️</button>
                        </div>
                    </div>
                    ${store.address ? `<div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">📍 ${store.address}</div>` : ''}
                    ${store.manager ? `<div style="font-size: 0.9em; color: #666;">👤 店长：${store.manager}</div>` : ''}
                    <div class="store-card-stats">
                        <div class="store-stat-item success">
                            <div class="label">今日营收</div>
                            <div class="value">¥${stats.todayRevenue.toLocaleString()}</div>
                        </div>
                        <div class="store-stat-item">
                            <div class="label">今日订单</div>
                            <div class="value">${stats.todayOrders}单</div>
                        </div>
                        <div class="store-stat-item">
                            <div class="label">总营收</div>
                            <div class="value">¥${stats.totalRevenue.toLocaleString()}</div>
                        </div>
                        <div class="store-stat-item">
                            <div class="label">员工数</div>
                            <div class="value">${stats.employeeCount}人</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 获取店铺统计数据
    getStoreStats(storeId) {
        const schedules = this.getStoreData(storeId, 'schedules') || [];
        const employees = this.getStoreData(storeId, 'employees') || [];
        
        // 今日日期
        const today = new Date().toISOString().split('T')[0];
        
        // 今日订单
        const todaySchedules = schedules.filter(s => s.scheduleDate === today);
        const todayRevenue = todaySchedules.reduce((sum, s) => sum + (parseFloat(s.payment) || 0), 0);
        const todayOrders = todaySchedules.length;
        
        // 总营收
        const totalRevenue = schedules.reduce((sum, s) => sum + (parseFloat(s.payment) || 0), 0);
        
        return {
            todayRevenue,
            todayOrders,
            totalRevenue,
            employeeCount: employees.length
        };
    }

    // 获取店铺的数据
    getStoreData(storeId, dataType) {
        const key = `store_${storeId}_${dataType}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // 更新总览统计
    updateOverviewStats() {
        let totalRevenue = 0;
        let totalOrders = 0;
        let totalEmployees = 0;

        this.stores.forEach(store => {
            const stats = this.getStoreStats(store.id);
            totalRevenue += stats.todayRevenue;
            totalOrders += stats.todayOrders;
            totalEmployees += stats.employeeCount;
        });

        document.getElementById('totalStores').textContent = this.stores.length;
        document.getElementById('todayRevenue').textContent = `¥${totalRevenue.toLocaleString()}`;
        document.getElementById('todayOrders').textContent = `${totalOrders}单`;
        document.getElementById('totalEmployees').textContent = `${totalEmployees}人`;
    }

    // 打开添加店铺模态框
    openAddStoreModal() {
        this.editingStoreId = null;
        document.getElementById('storeModalTitle').textContent = '添加新店铺';
        document.getElementById('storeForm').reset();
        document.getElementById('storeModal').style.display = 'block';
    }

    // 关闭店铺模态框
    closeStoreModal() {
        document.getElementById('storeModal').style.display = 'none';
        this.editingStoreId = null;
    }

    // 保存店铺
    saveStore() {
        const name = document.getElementById('storeName').value.trim();
        const address = document.getElementById('storeAddress').value.trim();
        const phone = document.getElementById('storePhone').value.trim();
        const manager = document.getElementById('storeManager').value.trim();
        const description = document.getElementById('storeDescription').value.trim();

        if (!name) {
            alert('请输入店铺名称！');
            return;
        }

        // 检查店铺名称是否重复
        const exists = this.stores.some(s => 
            s.name === name && s.id !== this.editingStoreId
        );
        
        if (exists) {
            alert('店铺名称已存在，请使用其他名称！');
            return;
        }

        if (this.editingStoreId) {
            // 编辑现有店铺
            const store = this.stores.find(s => s.id === this.editingStoreId);
            if (store) {
                store.name = name;
                store.address = address;
                store.phone = phone;
                store.manager = manager;
                store.description = description;
                store.updatedAt = new Date().toISOString();
            }
        } else {
            // 添加新店铺
            const newStore = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name,
                address,
                phone,
                manager,
                description,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.stores.push(newStore);
        }

        this.saveStores();
        this.renderStoreGrid();
        this.updateOverviewStats();
        this.closeStoreModal();

        alert(this.editingStoreId ? '✅ 店铺信息已更新！' : '✅ 店铺创建成功！');
    }

    // 编辑店铺
    editStore(storeId) {
        const store = this.stores.find(s => s.id === storeId);
        if (!store) return;

        this.editingStoreId = storeId;
        document.getElementById('storeModalTitle').textContent = '编辑店铺信息';
        document.getElementById('storeName').value = store.name;
        document.getElementById('storeAddress').value = store.address || '';
        document.getElementById('storePhone').value = store.phone || '';
        document.getElementById('storeManager').value = store.manager || '';
        document.getElementById('storeDescription').value = store.description || '';
        document.getElementById('storeModal').style.display = 'block';
    }

    // 删除店铺
    deleteStore(storeId) {
        const store = this.stores.find(s => s.id === storeId);
        if (!store) return;

        const stats = this.getStoreStats(storeId);
        
        const message = `⚠️ 确定要删除店铺"${store.name}"吗？

店铺数据统计：
• 总营收：¥${stats.totalRevenue.toLocaleString()}
• 员工数：${stats.employeeCount}人

⚠️ 警告：删除店铺将同时删除该店铺的所有数据（排班记录、员工信息、项目等），此操作不可恢复！

建议在删除前先备份店铺数据。`;

        if (!confirm(message)) return;

        // 二次确认
        const confirmText = prompt('⚠️ 最后确认 ⚠️\n\n请输入店铺名称来确认删除：');
        if (confirmText !== store.name) {
            if (confirmText !== null) {
                alert('输入错误，操作已取消');
            }
            return;
        }

        // 删除店铺数据
        this.deleteStoreData(storeId);
        
        // 从列表中移除
        this.stores = this.stores.filter(s => s.id !== storeId);
        this.saveStores();
        
        this.renderStoreGrid();
        this.updateOverviewStats();
        
        alert('✅ 店铺已删除！');
    }

    // 删除店铺的所有数据
    deleteStoreData(storeId) {
        const dataTypes = [
            'schedules', 'employees', 'projects', 
            'attendanceFees', 'interviewFees', 
            'operatingCosts', 'reportRebates', 
            'salaryTiers', 'salaryPassword'
        ];
        
        dataTypes.forEach(type => {
            const key = `store_${storeId}_${type}`;
            localStorage.removeItem(key);
        });
    }

    // 进入店铺管理
    enterStore(storeId) {
        const store = this.stores.find(s => s.id === storeId);
        if (!store) return;

        // 保存当前选中的店铺
        localStorage.setItem('currentStoreId', storeId);
        
        // 跳转到店铺管理页面
        window.location.href = 'index.html';
    }

    // 备份所有店铺数据
    backupAllStoresData() {
        try {
            if (this.stores.length === 0) {
                alert('暂无店铺数据可备份！');
                return;
            }

            const allData = {
                version: '2.0',
                backupDate: new Date().toISOString(),
                stores: this.stores,
                storesData: {}
            };

            // 收集每个店铺的数据
            this.stores.forEach(store => {
                const dataTypes = [
                    'schedules', 'employees', 'projects',
                    'attendanceFees', 'interviewFees',
                    'operatingCosts', 'reportRebates',
                    'salaryTiers', 'salaryPassword'
                ];

                allData.storesData[store.id] = {
                    storeName: store.name
                };

                dataTypes.forEach(type => {
                    const data = this.getStoreData(store.id, type);
                    if (data) {
                        allData.storesData[store.id][type] = data;
                    }
                });
            });

            // 转换为JSON字符串
            const jsonString = JSON.stringify(allData, null, 2);
            
            // 创建下载
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            const fileName = `多店铺完整备份_${this.formatDate(new Date())}_${new Date().getHours()}${String(new Date().getMinutes()).padStart(2, '0')}.json`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            alert(`✅ 所有店铺数据备份成功！\n\n共备份 ${this.stores.length} 家店铺的完整数据\n文件已保存到下载文件夹！`);
        } catch (error) {
            console.error('备份失败:', error);
            alert('❌ 备份失败：' + error.message);
        }
    }

    // 恢复所有店铺数据
    restoreAllStoresData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.name.endsWith('.json')) {
                alert('❌ 请选择JSON格式的备份文件！');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const backupData = JSON.parse(event.target.result);
                    
                    if (!backupData.version || !backupData.stores) {
                        throw new Error('备份文件格式不正确！');
                    }

                    const backupDate = new Date(backupData.backupDate).toLocaleString('zh-CN');
                    const message = `📦 备份文件信息：
━━━━━━━━━━━━━━━━━━━━━━━
备份时间：${backupDate}
店铺数量：${backupData.stores.length} 家
━━━━━━━━━━━━━━━━━━━━━━━

⚠️ 警告：恢复数据将完全覆盖当前所有店铺和数据！

确定要恢复这个备份吗？`;

                    if (!confirm(message)) return;

                    const confirmText = prompt('⚠️ 最后确认 ⚠️\n\n此操作将覆盖所有数据！\n请输入"确认恢复"来继续：');
                    if (confirmText !== '确认恢复') {
                        if (confirmText !== null) {
                            alert('输入错误，操作已取消');
                        }
                        return;
                    }

                    // 清除现有数据
                    this.stores.forEach(store => {
                        this.deleteStoreData(store.id);
                    });

                    // 恢复店铺列表
                    this.stores = backupData.stores;
                    this.saveStores();

                    // 恢复每个店铺的数据
                    Object.keys(backupData.storesData).forEach(storeId => {
                        const storeData = backupData.storesData[storeId];
                        const dataTypes = [
                            'schedules', 'employees', 'projects',
                            'attendanceFees', 'interviewFees',
                            'operatingCosts', 'reportRebates',
                            'salaryTiers', 'salaryPassword'
                        ];

                        dataTypes.forEach(type => {
                            if (storeData[type]) {
                                const key = `store_${storeId}_${type}`;
                                localStorage.setItem(key, JSON.stringify(storeData[type]));
                            }
                        });
                    });

                    // 刷新界面
                    this.renderStoreGrid();
                    this.updateOverviewStats();

                    alert(`✅ 数据恢复成功！\n\n已恢复 ${this.stores.length} 家店铺的完整数据！`);

                } catch (error) {
                    console.error('恢复数据失败:', error);
                    alert('❌ 恢复数据失败：' + error.message + '\n\n请确保选择的是正确的备份文件！');
                }
            };

            reader.onerror = () => {
                alert('❌ 文件读取失败！');
            };

            reader.readAsText(file);
        };

        input.click();
    }

    // 导出店铺列表
    exportStoresList() {
        if (this.stores.length === 0) {
            alert('暂无店铺数据可导出！');
            return;
        }

        const headers = ['店铺名称', '店铺地址', '联系电话', '店长姓名', '创建时间', '描述'];
        const csvContent = [
            headers.join(','),
            ...this.stores.map(store => [
                store.name,
                store.address || '',
                store.phone || '',
                store.manager || '',
                new Date(store.createdAt).toLocaleString('zh-CN'),
                store.description || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `店铺列表_${this.formatDate(new Date())}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert('✅ 店铺列表导出成功！');
    }

    // 格式化日期
    formatDate(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
}

// 初始化店铺管理中心
const storeCenter = new StoreCenterManager();

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('storeModal');
    if (event.target === modal) {
        storeCenter.closeStoreModal();
    }
};

