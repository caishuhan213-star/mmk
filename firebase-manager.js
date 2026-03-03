// Firebase实时同步管理器
class FirebaseManager {
    constructor() {
        this.firestore = null;
        this.auth = null;
        this.user = null;
        this.isOnline = navigator.onLine;
        this.pendingSync = [];
        this.syncEnabled = true;
        this.syncStatus = 'disconnected';
        
        // 初始化Firebase
        this.initFirebase();
        
        // 监听网络状态
        window.addEventListener('online', () => this.handleNetworkOnline());
        window.addEventListener('offline', () => this.handleNetworkOffline());
    }
    
    // 初始化Firebase
    async initFirebase() {
        // 检查Firebase SDK是否加载
        if (typeof firebase === "undefined") {
            console.error("Firebase SDK未加载，请检查网络连接");
            this.syncStatus = "sdk-not-loaded";
            this.syncEnabled = false;
            return;
        }
        try {
            // 初始化Firebase应用
            firebase.initializeApp(firebaseConfig);
            
            // 获取Firestore和Auth实例
            this.firestore = firebase.firestore();
            this.auth = firebase.auth();
            
            // 启用离线支持
            this.firestore.enablePersistence()
                .then(() => {
                    console.log('Firestore离线支持已启用');
                    this.syncStatus = 'connected';
                })
                .catch((err) => {
                    console.warn('Firestore离线支持启用失败:', err);
                    this.syncStatus = 'connected-no-persistence';
                });
            
            // 监听认证状态
            this.auth.onAuthStateChanged((user) => {
                this.user = user;
                if (user) {
                    console.log('用户已登录:', user.uid);
                    this.syncStatus = 'authenticated';
                    this.syncAllData();
                } else {
                    console.log('用户未登录，使用匿名登录');
                    this.signInAnonymously();
                }
            });
            
        } catch (error) {
            console.error('Firebase初始化失败:', error);
            this.syncStatus = 'error';
            this.syncEnabled = false;
        }
    }
    
    // 匿名登录
    async signInAnonymously() {
        try {
            await this.auth.signInAnonymously();
            console.log('匿名登录成功');
        } catch (error) {
            console.error('匿名登录失败:', error);
        }
    }
    
    // 处理网络恢复
    handleNetworkOnline() {
        console.log('网络已恢复');
        this.isOnline = true;
        this.syncStatus = 'connected';
        this.processPendingSync();
    }
    
    // 处理网络断开
    handleNetworkOffline() {
        console.log('网络已断开');
        this.isOnline = false;
        this.syncStatus = 'offline';
    }
    
    // 同步排班数据到云端
    async syncSchedules(schedules, storeId = 'default') {
        if (!this.syncEnabled || !this.user || !this.firestore) {
            console.log('同步未启用或未初始化，数据保存到本地');
            return false;
        }
        
        try {
            const batch = this.firestore.batch();
            const collectionRef = this.firestore.collection(`users/${this.user.uid}/stores/${storeId}/schedules`);
            
            // 删除旧的云端数据
            const querySnapshot = await collectionRef.get();
            querySnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // 添加新的数据
            schedules.forEach(schedule => {
                const docRef = collectionRef.doc(schedule.id);
                batch.set(docRef, {
                    ...schedule,
                    storeId: storeId,
                    userId: this.user.uid,
                    syncedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: Date.now()
                });
            });
            
            await batch.commit();
            console.log(`排班数据同步成功: ${schedules.length}条记录`);
            return true;
            
        } catch (error) {
            console.error('排班数据同步失败:', error);
            
            // 保存到待同步队列
            this.pendingSync.push({
                type: 'schedules',
                data: schedules,
                storeId: storeId,
                timestamp: Date.now()
            });
            
            // 保存到本地存储
            localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));
            return false;
        }
    }
    
    // 从云端加载排班数据
    async loadSchedules(storeId = 'default') {
        if (!this.syncEnabled || !this.user || !this.firestore) {
            console.log('同步未启用或未初始化，从本地加载数据');
            return null;
        }
        
        try {
            const collectionRef = this.firestore.collection(`users/${this.user.uid}/stores/${storeId}/schedules`);
            const querySnapshot = await collectionRef.orderBy('syncedAt', 'desc').get();
            
            const schedules = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                // 移除Firebase特有的字段
                const { storeId, userId, syncedAt, updatedAt, ...schedule } = data;
                schedules.push(schedule);
            });
            
            console.log(`从云端加载排班数据: ${schedules.length}条记录`);
            return schedules;
            
        } catch (error) {
            console.error('从云端加载排班数据失败:', error);
            return null;
        }
    }
    
    // 同步所有数据
    async syncAllData() {
        if (!this.isOnline) {
            console.log('网络离线，跳过同步');
            return;
        }
        
        // 这里可以添加其他数据的同步逻辑
        console.log('开始同步所有数据...');
        
        // 处理待同步队列
        await this.processPendingSync();
    }
    
    // 处理待同步队列
    async processPendingSync() {
        if (this.pendingSync.length === 0) {
            const stored = localStorage.getItem('pendingSync');
            if (stored) {
                this.pendingSync = JSON.parse(stored);
            }
        }
        
        if (this.pendingSync.length === 0 || !this.isOnline) {
            return;
        }
        
        console.log(`处理待同步队列: ${this.pendingSync.length}个任务`);
        
        const successful = [];
        const failed = [];
        
        for (const task of this.pendingSync) {
            try {
                if (task.type === 'schedules') {
                    await this.syncSchedules(task.data, task.storeId);
                    successful.push(task);
                }
            } catch (error) {
                console.error('待同步任务失败:', error);
                failed.push(task);
            }
        }
        
        // 更新待同步队列
        this.pendingSync = failed;
        localStorage.setItem('pendingSync', JSON.stringify(failed));
        
        console.log(`待同步队列处理完成: ${successful.length}成功, ${failed.length}失败`);
    }
    
    // 获取同步状态
    getSyncStatus() {
        return {
            enabled: this.syncEnabled,
            status: this.syncStatus,
            online: this.isOnline,
            authenticated: !!this.user,
            pendingSync: this.pendingSync.length,
            userId: this.user ? this.user.uid : null
        };
    }
    
    // 显示同步状态
    showSyncStatus() {
        const status = this.getSyncStatus();
        console.log('同步状态:', status);
        
        // 可以在UI上显示状态
        const statusElement = document.getElementById('syncStatus');
        if (statusElement) {
            let statusText = '🟢 已同步';
            let statusClass = 'sync-status-connected';
            
            if (!status.online) {
                statusText = '🔴 离线';
                statusClass = 'sync-status-offline';
            } else if (status.status === 'offline') {
                statusText = '🟡 同步中...';
                statusClass = 'sync-status-syncing';
            } else if (status.pendingSync > 0) {
                statusText = `🟡 待同步: ${status.pendingSync}`;
                statusClass = 'sync-status-pending';
            }
            
            statusElement.innerHTML = statusText;
            statusElement.className = `sync-status ${statusClass}`;
        }
    }
}