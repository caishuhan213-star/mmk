// 多店铺管理中心 JavaScript

class StoreCenterManager {
    constructor() {
        this.stores = [];
        this.editingStoreId = null;
        this.firebaseManager = null;
        this.syncEnabled = false;
        
        // 初始化Firebase管理器
        this.initFirebase();
        
        // 加载店铺数据
        this.loadStores();
        
        this.init();
    }

    // 初始化Firebase
    initFirebase() {
        console.log('初始化Firebase同步...');
        // 检查是否已登录
        if (window.firebaseManager) {
            this.firebaseManager = window.firebaseManager;
            const status = this.firebaseManager.getSyncStatus();
            if (status.authenticated) {
                this.syncEnabled = true;
                console.log('✅ Firebase同步已启用，用户已登录');
            } else {
                console.log('⚠️ Firebase同步已就绪，但用户未登录');
            }
        } else {
            console.warn('⚠️ Firebase管理器未找到，店铺数据将仅本地存储');
        }
        
        // 监听认证状态变化
        if (this.firebaseManager) {
            // 每5秒检查一次登录状态
            setInterval(() => {
                if (this.firebaseManager) {
                    const status = this.firebaseManager.getSyncStatus();
                    const wasEnabled = this.syncEnabled;
                    this.syncEnabled = status.authenticated;
                    if (this.syncEnabled && !wasEnabled) {
                        console.log('✅ 用户已登录，启用店铺数据同步');
                        // 用户刚登录，从云端同步店铺数据
                        this.syncStoresFromCloud();
                    } else if (!this.syncEnabled && wasEnabled) {
                        console.log('🔴 用户已登出，禁用店铺数据同步');
                    }
                }
            }, 5000);
        }
    }

    // 初始化
    init() {
        this.renderStoreGrid();
        this.updateOverviewStats();
    }

    // 加载店铺列表
    loadStores() {
        console.log('加载店铺列表...');
        // 先从本地加载
        const data = localStorage.getItem('stores');
        this.stores = data ? JSON.parse(data) : [];
        console.log(`从本地加载 ${this.stores.length} 个店铺`);
        
        // 如果Firebase同步已启用，尝试从云端加载
        if (this.syncEnabled && this.firebaseManager) {
            console.log('尝试从Firebase加载店铺数据...');
            this.syncStoresFromCloud();
        }
        
        return this.stores;
    }

    // 保存店铺列表
    saveStores() {
        console.log('保存店铺列表...');
        localStorage.setItem('stores', JSON.stringify(this.stores));
        console.log(`已保存 ${this.stores.length} 个店铺到本地`);
        
        // 如果Firebase同步已启用，同步到云端
        if (this.syncEnabled && this.firebaseManager) {
            this.syncStoresToCloud();
        }
    }

    // 同步店铺数据到云端
    async syncStoresToCloud() {
        if (!this.syncEnabled || !this.firebaseManager || !this.firebaseManager.firestore) {
            console.log('Firebase未就绪，跳过店铺数据同步到云端');
            return;
        }
        
        try {
            console.log('开始同步店铺数据到Firebase...');
            const userId = this.firebaseManager.user.uid;
            const storeRef = this.firebaseManager.firestore.collection(`users/${userId}/stores`);
            
            // 使用批处理
            const batch = this.firebaseManager.firestore.batch();
            
            // 同步每个店铺
            this.stores.forEach(store => {
                const docRef = storeRef.doc(store.id);
                batch.set(docRef, {
                    ...store,
                    userId: userId,
                    syncedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: new Date().toISOString()
                });
            });
            
            await batch.commit();
            console.log(`✅ 店铺数据同步成功: ${this.stores.length}个店铺`);
        } catch (error) {
            console.error('❌ 店铺数据同步失败:', error);
        }
    }

    // 从云端同步店铺数据
    async syncStoresFromCloud() {
        console.log('🔍 syncStoresFromCloud被调用');
        console.log('🔍 同步状态检查:', {
            syncEnabled: this.syncEnabled,
            hasFirebaseManager: !!this.firebaseManager,
            hasFirestore: this.firebaseManager ? !!this.firebaseManager.firestore : false,
            firebaseManagerStatus: this.firebaseManager ? this.firebaseManager.getSyncStatus() : '未找到'
        });
        
        if (!this.syncEnabled || !this.firebaseManager || !this.firebaseManager.firestore) {
            console.log('❌ Firebase未就绪，跳过从云端加载店铺数据');
            return;
        }
        
        try {
            console.log('🔄 从Firebase加载店铺数据...');
            const userId = this.firebaseManager.user.uid;
            console.log('🔍 当前用户ID:', userId);
            
            const storeRef = this.firebaseManager.firestore.collection(`users/${userId}/stores`);
            console.log('🔍 Firestore路径:', `users/${userId}/stores`);
            
            console.log('🔍 开始查询Firestore...');
            const querySnapshot = await storeRef.get();
            console.log('🔍 Firestore查询完成，结果:', {
                empty: querySnapshot.empty,
                size: querySnapshot.size,
                docs: querySnapshot.docs.length
            });
            
            if (querySnapshot.empty) {
                console.log('⚠️ 云端没有店铺数据');
                return;
            }
            
            const cloudStores = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                console.log(`📄 加载店铺文档 ${doc.id}:`, data);
                // 移除Firebase特有的字段
                const { userId, syncedAt, updatedAt, ...store } = data;
                cloudStores.push(store);
            });
            
            console.log(`✅ 从云端加载到 ${cloudStores.length} 个店铺:`, cloudStores.map(s => ({id: s.id, name: s.name})));
            
            // 合并数据（云端优先）
            const mergedStores = this.mergeStores(this.stores, cloudStores);
            console.log('🔍 数据合并结果:', {
                本地店铺数: this.stores.length,
                云端店铺数: cloudStores.length,
                合并后店铺数: mergedStores.length
            });
            
            if (JSON.stringify(mergedStores) !== JSON.stringify(this.stores)) {
                console.log('🔄 店铺数据有更新，更新本地存储');
                this.stores = mergedStores;
                localStorage.setItem('stores', JSON.stringify(this.stores));
                this.renderStoreGrid();
                this.updateOverviewStats();
                console.log('✅ 店铺数据已从云端更新');
            } else {
                console.log('ℹ️ 店铺数据与云端一致，无需更新');
            }
        } catch (error) {
            console.error('❌ 从云端加载店铺数据失败:', error);
            console.error('🔍 错误详情:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
        }
    }

    // 手动测试Firestore同步
    async testFirestoreSync() {
        console.log('🔧 ======= 开始Firestore同步测试 =======');
        
        // 检查Firebase管理器
        if (!window.firebaseManager) {
            console.error('❌ 错误: window.firebaseManager 未定义');
            alert('Firebase管理器未初始化，请刷新页面重试');
            return;
        }
        
        const fbManager = window.firebaseManager;
        console.log('🔍 Firebase管理器状态:', fbManager.getSyncStatus());
        
        // 检查用户是否登录
        if (!fbManager.user) {
            console.error('❌ 错误: 用户未登录');
            alert('请先登录Google账号');
            return;
        }
        
        const userId = fbManager.user.uid;
        const userEmail = fbManager.user.email;
        console.log('🔍 用户信息:', { userId, userEmail });
        
        // 测试Firestore连接
        try {
            console.log('🔄 测试Firestore写入...');
            const testRef = fbManager.firestore.collection('_test').doc('connection');
            await testRef.set({
                test: true,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: userId,
                email: userEmail,
                testTime: new Date().toISOString()
            });
            console.log('✅ Firestore写入测试成功');
            
            // 测试读取
            console.log('🔄 测试Firestore读取...');
            const doc = await testRef.get();
            if (doc.exists) {
                console.log('✅ Firestore读取测试成功:', doc.data());
            } else {
                console.error('❌ Firestore读取测试失败: 文档不存在');
            }
            
            // 清理测试文档
            await testRef.delete();
            console.log('✅ 测试文档已清理');
            
            // 测试店铺数据同步
            console.log('🔄 测试店铺数据同步...');
            await this.syncStoresFromCloud();
            
            console.log('✅ ======= Firestore同步测试完成 =======');
            alert('✅ 同步测试完成！请查看控制台查看详细结果');
            
        } catch (error) {
            console.error('❌ Firestore测试失败:', error);
            console.error('🔍 错误详情:', {
                code: error.code,
                message: error.message,
                name: error.name
            });
            alert(`❌ 同步测试失败: ${error.message}\n\n请查看控制台获取详细错误信息`);
        }
    }

    // 手动强制同步店铺数据
    async forceSyncStores() {
        console.log('🔧 强制同步店铺数据...');
        if (this.firebaseManager && this.firebaseManager.user) {
            await this.syncStoresToCloud();
            await this.syncStoresFromCloud();
            alert('✅ 强制同步完成！请查看控制台查看详细结果');
        } else {
            alert('❌ 无法强制同步：用户未登录或Firebase未初始化');
        }
    }

    // 合并店铺数据（云端优先）
    mergeStores(localStores, cloudStores) {
        const merged = [...cloudStores]; // 云端优先
        
        // 添加本地有但云端没有的店铺（根据ID）
        localStores.forEach(localStore => {
            const exists = merged.some(cloudStore => cloudStore.id === localStore.id);
            if (!exists) {
                merged.push(localStore);
            }
        });
        
        return merged;
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

