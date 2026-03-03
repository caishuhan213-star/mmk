#!/bin/bash
# 创建简化版本，移除Firebase相关代码

# 1. 移除Firebase SDK引用
sed -i '' '/firebase-app.js/d' index.html
sed -i '' '/firebase-firestore.js/d' index.html
sed -i '' '/firebase-auth.js/d' index.html
sed -i '' '/firebase-config.js/d' index.html
sed -i '' '/firebase-manager.js/d' index.html

# 2. 移除FirebaseManager初始化
sed -i '' '/this.firebaseManager = new FirebaseManager()/d' script.js
sed -i '' '/this.firebaseManager/d' script.js

# 3. 简化loadSchedules方法
sed -i '' '/从Firebase云端加载/d' script.js
sed -i '' '/cloudSchedules/d' script.js
sed -i '' '/firebaseError/d' script.js

# 4. 简化saveSchedules方法
sed -i '' '/同步到Firebase云端/d' script.js
sed -i '' '/this.firebaseManager.syncSchedules/d' script.js

echo "简化版本创建完成"
