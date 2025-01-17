import apiService from './api.js';

class ChatUI {
    constructor() {
        this.messagesContainer = document.querySelector('.messages-container');
        this.inputField = document.querySelector('.prompt-input');
        this.sendButton = document.querySelector('.send-button');
        this.clearButton = document.querySelector('.clear-button');
        this.messageHistory = [];
        
        // 获取选择框元素
        this.llmSelect = document.querySelector('.llm-select');
        this.embeddingSelect = document.querySelector('.embedding-select');
        
        // 初始化时获取模型信息
        this.fetchModelInfo();
        
        this.uploadArea = document.querySelector('.upload-area');
        
        // 存储上传文件后的路径信息
        this.currentFile = {
            dbPath: '',
            filePath: '',
            fileName: ''
        };
        
        // 添加历史记录相关的元素引用
        this.historyButton = document.querySelector('.history-button');
        this.historyModal = document.querySelector('.history-modal');
        this.closeHistoryButton = document.querySelector('.close-history');
        this.historyList = document.querySelector('.history-list');
        
        // 添加初始聊天时间属性
        this.chatInitTime = null;
        
        this.setupEventListeners();
        this.setupFileUpload();
        
        // 绑定历史记录相关的事件
        this.setupHistoryEvents();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.clearButton.addEventListener('click', () => this.clearChat());
    }

    async sendMessage() {
        const userInput = this.inputField.value.trim();
        if (!userInput) return;

        // 获取用户信息
        const userInfo = JSON.parse(localStorage.getItem('user')) || {};
        const username = userInfo.username;

        if (!username) {
            alert('请先登录');
            return;
        }

        if (!this.chatInitTime) {
            alert('请先上传文件');
            return;
        }

        // 从选择框获取当前选中的模型
        const selectedLLM = this.llmSelect.value;
        const selectedEmbedding = this.embeddingSelect.value;

        const formData = new FormData();
        formData.append('userinput', userInput);
        formData.append('model', selectedLLM);           // 使用选择框的值
        formData.append('username', username);
        formData.append('filename', this.currentFile.filePath);
        formData.append('dbname', this.currentFile.dbPath);
        formData.append('embedding_model', selectedEmbedding); // 使用选择框的值
        formData.append('time', this.chatInitTime);

        console.log('发送聊天参数:', {
            userinput: userInput,
            model: selectedLLM,
            username: username,
            filename: this.currentFile.filePath,
            dbname: this.currentFile.dbPath,
            embedding_model: selectedEmbedding
        });

        // 显示用户消息
        this.addMessage(userInput, 'user');
        this.inputField.value = '';

        // 显示加载指示器
        const loadingId = this.addLoadingIndicator();

        try {
            const response = await apiService.chat(formData);
            this.removeLoadingIndicator(loadingId);

            if (response.message === "llm responses successfully!") {
                this.addMessage(response.output, 'assistant');
            } else {
                this.addMessage('抱歉，发生了错误：' + response.message, 'system');
            }
        } catch (error) {
            console.error('聊天错误:', error);
            this.removeLoadingIndicator(loadingId);
            this.addMessage('抱歉，发生了错误，请重试。', 'system');
        }
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            ${type !== 'user' ? '<button class="copy-btn">复制</button>' : ''}
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();

        // 添加复制功能
        const copyBtn = messageDiv.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(content);
                alert(translations[currentLang].copied);
            });
        }
    }

    addLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'typing-indicator';
        loadingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        this.messagesContainer.appendChild(loadingDiv);
        this.scrollToBottom();
        return loadingDiv.id = 'loading-' + Date.now();
    }

    removeLoadingIndicator(id) {
        const loadingDiv = document.getElementById(id);
        if (loadingDiv) loadingDiv.remove();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    clearChat() {
        while (this.messagesContainer.firstChild) {
            this.messagesContainer.firstChild.remove();
        }
    }

    async getModelResponse(message) {
        // 这里替换为实际的API调用
        // 示例：
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            const data = await response.json();
            return data.response;
        } catch (error) {
            throw new Error('Failed to get response from model');
        }
    }

    setupFileUpload() {
        const uploadArea = document.querySelector('.upload-area');
        const uploadButton = uploadArea.querySelector('button');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.style.display = 'none';
        fileInput.accept = '.txt,.pdf,.doc,.docx'; // 限制文件类型
        uploadArea.appendChild(fileInput);

        // 点击上传按钮触发文件选择
        uploadButton.addEventListener('click', () => {
            fileInput.click();
        });

        // 处理拖放
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files[0]);
            }
        });

        // 处理文件上传
        const handleFileUpload = async (file) => {
            try {
                // 获取用户信息
                const userInfo = JSON.parse(localStorage.getItem('user')) || {};
                const username = userInfo.username;

                if (!username) {
                    alert('请先登录');
                    return;
                }

                // 从选择框获取当前选中的模型
                const selectedLLM = this.llmSelect.value;
                const selectedEmbedding = this.embeddingSelect.value;

                const formData = new FormData();
                formData.append('username', username);
                formData.append('model_name', selectedLLM);           // 使用选择框的值
                formData.append('embedding_model', selectedEmbedding); // 使用选择框的值
                formData.append('file', file);

                console.log('上传文件信息:', {
                    username: username,
                    model_name: selectedLLM,
                    embedding_model: selectedEmbedding,
                    file: file.name
                });

                const result = await apiService.upload(formData);
                console.log('上传结果:', result);  // 调试日志

                if (result.success) {
                    alert('文件上传成功！');
                    this.displayUploadedFile(file.name);
                    // 保存文件信息
                    if (result.data) {
                        this.setCurrentFile(result.data);
                    }
                } else {
                    alert('上传失败: ' + (result.message || '未知错误'));
                }
            } catch (error) {
                console.error('上传错误:', error);
                alert('上传错误: ' + error.message);
            }
        };

        // 处理文件选择
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }

    // 获取并更新模型信息
    async fetchModelInfo() {
        try {
            const response = await apiService.getInfo();
            console.log('模型信息:', response);

            // 更新大语言模型选择框
            if (this.llmSelect && response.llm_models) {
                this.llmSelect.innerHTML = response.llm_models
                    .map(model => `<option value="${model}">${model}</option>`)
                    .join('');
            }

            // 更新 Embedding 模型选择框
            if (this.embeddingSelect && response.embedding_models) {
                this.embeddingSelect.innerHTML = response.embedding_models
                    .map(model => `<option value="${model}">${model}</option>`)
                    .join('');
            }

            console.log('选择框更新完成:', {
                llm: this.llmSelect?.value,
                embedding: this.embeddingSelect?.value
            });
        } catch (error) {
            console.error('获取模型信息失败:', error);
        }
    }

    // 添加显示已上传文件的方法
    displayUploadedFile(fileName) {
        // 检查是否已经存在文件列表
        let fileList = this.uploadArea.querySelector('.file-list');
        
        // 如果文件列表不存在，才创建新的
        if (!fileList) {
            fileList = document.createElement('div');
            fileList.className = 'file-list';
            this.uploadArea.appendChild(fileList);
        } else {
            // 如果已存在，清空现有内容
            fileList.innerHTML = '';
        }

        // 创建文件项
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="file-name">${fileName}</span>
            <button class="file-remove" title="删除文件">×</button>
        `;

        // 添加删除文件的功能
        const removeButton = fileItem.querySelector('.file-remove');
        removeButton.addEventListener('click', () => {
            fileList.remove();
            // 清除文件相关信息
            this.currentFile = {
                dbPath: '',
                filePath: '',
                fileName: ''
            };
            this.chatInitTime = null;
        });

        fileList.appendChild(fileItem);
    }

    // 添加设置当前文件信息的方法
    setCurrentFile(fileInfo) {
        this.currentFile = {
            dbPath: fileInfo.db_path,
            filePath: fileInfo.file_path,
            fileName: fileInfo.file_path.split('/').pop()
        };
        
        // 记录初始聊天时间
        if (!this.chatInitTime) {
            const now = new Date();
            this.chatInitTime = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0') + ' ' +
                String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0') + ':' +
                String(now.getSeconds()).padStart(2, '0');
        }
    }

    setupHistoryEvents() {
        this.historyButton.addEventListener('click', () => this.showHistory());
        this.closeHistoryButton.addEventListener('click', () => {
            this.historyModal.style.display = 'none';
        });
    }

    async showHistory() {
        try {
            const userInfo = JSON.parse(localStorage.getItem('user')) || {};
            const username = userInfo.username;

            if (!username) {
                alert('请先登录');
                return;
            }

            if (!this.chatInitTime) {
                alert('请先上传文件');
                return;
            }

            const formData = new FormData();
            formData.append('username', username);
            formData.append('llm', this.llmSelect.value);
            formData.append('file_name', this.currentFile.fileName);
            formData.append('embedding_model', this.embeddingSelect.value);
            //formData.append('time', this.chatInitTime);  // 使用初始聊天时间

            const response = await apiService.getHistory(formData);
            this.displayHistory(response);
            this.historyModal.style.display = 'flex';
        } catch (error) {
            console.error('获取历史记录失败:', error);
            alert('获取历史记录失败，请重试');
        }
    }

    displayHistory(response) {
        this.historyList.innerHTML = '';
        
        if (!response.data || !Array.isArray(response.data)) {
            this.historyList.innerHTML = '<div class="history-item">暂无历史记录</div>';
            return;
        }

        // 按时间排序，最新的在前面
        const sortedHistory = response.data.sort((a, b) => 
            new Date(b.create_time) - new Date(a.create_time)
        );

        sortedHistory.forEach((conv, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            // 格式化时间
            const createTime = conv.create_time;
            
            historyItem.innerHTML = `
                <div class="history-item-header">
                    <span class="history-index">#${index + 1}</span>
                    <span class="history-time">时间: ${createTime}</span>
                </div>
                <div class="history-item-content">
                    <div class="history-message user">
                        <strong>用户:</strong> ${conv.input}
                    </div>
                    ${conv.output ? `
                        <div class="history-message assistant">
                            <strong>助手:</strong> ${conv.output}
                        </div>
                    ` : ''}
                </div>
            `;
            
            this.historyList.appendChild(historyItem);
        });

        // 如果没有记录
        if (sortedHistory.length === 0) {
            this.historyList.innerHTML = '<div class="history-item">暂无历史记录</div>';
        }
    }
}

// 初始化聊天界面
const chatUI = new ChatUI();