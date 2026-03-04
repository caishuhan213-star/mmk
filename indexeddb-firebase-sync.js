// IndexedDBManagerWithFirebase - 增强版IndexedDB管理器，支持Firebase同步
// 继承自IndexedDBManager，重写关键方法以添加云端同步

class IndexedDBManagerWithFirebase extends IndexedDBManager {
    constructor() {
        super();
        console.log('IndexedDBManagerWithFirebase 初始化');
        
        // 初始化Firebase管理器
        this.firebaseManager = new FirebaseManager();
        
        // 同步设置
        this.syncEnabled = true;
        this.syncQueue = [];
        this.isSyncing = false;
        
        // 启动定时同步
        this.startSyncInterval();
    }
    
    // 启动定时同步
    startSyncInterval() {
        // 每60秒检查一次同步
        setInterval(() => {
            if (this.syncQueue.length > 0 && !this.isSyncing) {
                this.processSyncQueue();
            }
        }, 60000);
    }
    
    // ======================
    // 重写保存方法以添加同步
    // ======================
    
    async saveSchedules(schedules, storeId) {
        // 调用父类方法保存到本地
        const result = await super.saveSchedules(schedules, storeId);
        
        // 添加到同步队列
        if (this.syncEnabled && schedules.length > 0) {
            this.addToSyncQueue('schedules', schedules, storeId);
        }
        
        return result;
    }
    
    async saveOperatingCosts(costs, storeId) {
        const result = await super.saveOperatingCosts(costs, storeId);
        
        if (this.syncEnabled && costs.length > 0) {
            this.addToSyncQueue('operatingCosts', costs, storeId);
        }
        
        return result;
    }
    
    async saveAttendanceFees(fees, storeId) {
        const result = await super.saveAttendanceFees(fees, storeId);
        
        if (this.syncEnabled && fees.length > 0) {
            this.addToSyncQueue('attendanceFees', fees, storeId);
        }
        
        return result;
    }
    
    async saveEmployees(employees, storeId) {
        const result = await super.saveEmployees(employees, storeId);
        
        if (this.syncEnabled && employees.length > 0) {
            this.addToSyncQueue('employees', employees, storeId);
        }
        
        return result;
    }
    
    // ======================
    // 重写加载方法以尝试从云端更新
    // ======================
    
    async loadSchedules(storeId) {
        // 先从本地加载
        const localSchedules = await super.loadSchedules(storeId);
        
        // 如果Firebase就绪，尝试从云端加载更新
        if (this.syncEnabled && this.firebaseManager.syncStatus === 'ready') {
            try {
                const cloudSchedules = await this.firebaseManager.loadSchedules(storeId);
                if (cloudSchedules && cloudSchedules.length > 0) {
                    console.log(`从云端加载到 ${cloudSchedules.length} 条排班记录`);
                    
                    // 合并数据（简单的ID合并，云端优先）
                    const merged = this.mergeData(localSchedules, cloudSchedules, 'id');
                    
                    // 如果有变化，更新本地
                    if (merged.length !== localSchedules.length) {
                        await super.saveSchedules(merged, storeId);
                        return merged;
                    }
                }
            } catch (error) {
                console.error('从云端加载排班数据失败:', error);
            }
        }
        
        return localSchedules;
    }
    
    // ======================
    // 同步管理
    // ======================
    
    addToSyncQueue(collectionName, dataArray, storeId = 'default') {
        this.syncQueue.push({
            collection: collectionName,
            data: dataArray,
            storeId: storeId,
            timestamp: Date.now()
        });
        
        console.log(`添加到同步队列: ${collectionName} (${dataArray.length}条)`);
        
        // 如果队列较小，立即处理
        if (this.syncQueue.length < 3) {
            this.processSyncQueue();
        }
    }
    
    async processSyncQueue() {
        if (this.isSyncing || this.syncQueue.length === 0) {
            return;
        }
        
        this.isSyncing = true;
        
        try {
            const item = this.syncQueue[0]; // 处理第一个
            
            console.log(`处理同步: ${item.collection} (${item.data.length}条)`);
            
            let success = false;
            
            // 根据集合类型调用不同的同步方法
            if (item.collection === 'schedules') {
                success = await this.firebaseManager.syncSchedules(item.data, item.storeId);
            }
            // 其他集合类型可以在这里添加
            
            if (success) {
                // 移除已同步的项
                this.syncQueue.shift();
                console.log('同步成功');
                
                // 继续处理下一个
                setTimeout(() => {
                    this.isSyncing = false;
                    if (this.syncQueue.length > 0) {
                        this.processSyncQueue();
                    }
                }, 1000);
            } else {
                console.warn('同步失败，稍后重试');
                this.isSyncing = false;
            }
        } catch (error) {
            console.error('同步处理出错:', error);
            this.isSyncing = false;
        }
    }
    
    // ======================
    // 工具方法
    // ======================
    
    mergeData(localArray, cloudArray, idField = 'id') {
        const map = new Map();
        
        // 先添加本地数据
        localArray.forEach(item => {
            map.set(item[idField], item);
        });
        
        // 用云端数据覆盖（云端优先）
        cloudArray.forEach(item => {
            map.set(item[idField], item);
        });
        
        return Array.from(map.values());
    }
    
    // 获取同步状态
    getSyncStatus() {
        return {
            syncEnabled: this.syncEnabled,
            queueSize: this.syncQueue.length,
            isSyncing: this.isSyncing,
            firebaseStatus: this.firebaseManager.getSyncStatus()
        };
    }
    
    // 手动触发同步
    async triggerSync() {
        console.log('手动触发同步');
        return this.processSyncQueue();
    }
}