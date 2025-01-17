import apiService from './api.js';
import { translations } from './translations.js';

class AuthManager {
    constructor() {
        this.loginModal = document.getElementById('loginModal');
        this.loginButton = document.getElementById('loginButton');
        this.registerButton = document.getElementById('registerButton');
        this.loginToggle = document.getElementById('loginToggle');
        this.logoutButton = document.getElementById('logoutButton');
        this.welcomeText = document.getElementById('welcomeText');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');

        // 确保初始状态为未登录
        localStorage.removeItem('user');
        this.setupEventListeners();
        this.updateUIAfterLogout();
    }

    setupEventListeners() {
        // 登录按钮点击事件
        if (this.loginButton) {
            this.loginButton.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('点击登录按钮'); // 添加调试日志
                await this.login();
            });
        }

        // 切换登录模态框显示
        if (this.loginToggle) {
            this.loginToggle.addEventListener('click', () => {
                console.log('显示登录模态框'); // 添加调试日志
                this.loginModal.style.display = 'block';
            });
        }

        // 注册按钮点击事件
        if (this.registerButton) {
            this.registerButton.addEventListener('click', async (e) => {
                e.preventDefault(); // 防止表单默认提交
                await this.register();
            });
        }

        // 退出登录
        document.getElementById('logoutButton').addEventListener('click', () => {
            this.logout();
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('loginModal')) {
                document.getElementById('loginModal').style.display = 'none';
            }
        });
    }

    async login() {
        try {
            console.log('开始登录...'); // 调试日志
            console.log('用户名输入框:', this.usernameInput); // 调试日志
            console.log('密码输入框:', this.passwordInput); // 调试日志

            // 确保输入框存在
            if (!this.usernameInput || !this.passwordInput) {
                console.error('找不到用户名或密码输入框');
                return;
            }

            const username = this.usernameInput.value.trim();
            const password = this.passwordInput.value.trim();
            
            if (!username || !password) {
                alert('请输入用户名和密码');
                return;
            }

            console.log('发送登录请求...'); // 调试日志
            
            const response = await apiService.login(username, password);
            console.log('登录响应:', response); // 调试日志

            if (response.success) {
                localStorage.setItem('user', JSON.stringify({
                    username,
                    isLoggedIn: true
                }));
                
                this.isLoggedIn = true;
                this.currentUsername = username;
                this.updateUIAfterLogin(username);
                this.loginModal.style.display = 'none';
                alert('登录成功！');
            } else {
                alert(response.message || '登录失败，请检查用户名和密码');
            }
        } catch (error) {
            console.error('登录错误:', error);
            alert('登录过程中发生错误');
        }
    }

    async register() {
        try {
            console.log('开始注册...'); // 调试日志
            const username = this.username.value.trim();
            const password = this.password.value.trim();
            
            if (!username || !password) {
                alert('请输入用户名和密码');
                return;
            }

            console.log('发送注册请求...'); // 调试日志
            
            // 使用 apiService 发送注册请求
            const response = await apiService.register(username, password);
            console.log('注册响应:', response); // 调试日志

            if (response.success) {
                alert('注册成功，请登录');
                // 清空输入框
                this.username.value = '';
                this.password.value = '';
            } else {
                alert(response.message || '注册失败，请重试');
            }
        } catch (error) {
            console.error('注册错误:', error);
            alert('注册过程中发生错误');
        }
    }

    logout() {
        this.isLoggedIn = false;
        this.username = '';
        localStorage.removeItem('user');
        this.updateUIAfterLogout();
    }

    checkLoginStatus() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.isLoggedIn) {
            this.isLoggedIn = true;
            this.username = user.username;
            this.updateUIAfterLogin();
            this.loadChatHistory();
        }
    }

    updateUIAfterLogin(username) {
        this.welcomeText.textContent = translations.zh.welcome + username;
        this.loginToggle.style.display = 'none';
        this.logoutButton.style.display = 'block';
    }

    updateUIAfterLogout() {
        this.welcomeText.textContent = translations.zh.notLogged;
        this.loginToggle.style.display = 'block';
        this.logoutButton.style.display = 'none';
    }

    createHistorySection() {
        const chatSection = document.querySelector('.chat-section');
        let historySection = document.querySelector('.chat-history');
        
        if (!historySection) {
            historySection = document.createElement('div');
            historySection.className = 'chat-history';
            historySection.innerHTML = `<h3>${translations[currentLang].chatHistory}</h3>`;
            chatSection.insertBefore(historySection, chatSection.firstChild);
        }
    }

    removeHistorySection() {
        const historySection = document.querySelector('.chat-history');
        if (historySection) {
            historySection.remove();
        }
    }

    loadChatHistory() {
        // 从localStorage加载聊天历史
        const history = JSON.parse(localStorage.getItem(`chat_history_${this.username}`)) || [];
        this.displayChatHistory(history);
    }

    saveChatHistory(message) {
        if (!this.isLoggedIn) return;

        const history = JSON.parse(localStorage.getItem(`chat_history_${this.username}`)) || [];
        history.push({
            message,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(`chat_history_${this.username}`, JSON.stringify(history));
        this.displayChatHistory(history);
    }

    displayChatHistory(history) {
        const historySection = document.querySelector('.chat-history');
        if (!historySection) return;

        historySection.innerHTML = `<h3>${translations[currentLang].chatHistory}</h3>`;
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.textContent = item.message;
            historyItem.onclick = () => {
                document.querySelector('.prompt-input').value = item.message;
            };
            historySection.appendChild(historyItem);
        });
    }
}

const authManager = new AuthManager();
export default authManager;
