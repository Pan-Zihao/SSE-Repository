import { translations } from './translations.js';  // 添加这行

let currentLang = 'zh'; // 默认语言

// 切换语言函数
function toggleLanguage() {
    console.log('切换语言'); // 添加调试日志
    currentLang = currentLang === 'zh' ? 'en' : 'zh';
    updatePageLanguage();
}

// 更新页面文本
function updatePageLanguage() {
    // 更新登录相关文本
    document.querySelector('#loginModal h2').textContent = translations[currentLang].loginTitle;
    document.querySelector('#username').placeholder = translations[currentLang].username;
    document.querySelector('#password').placeholder = translations[currentLang].password;
    document.querySelector('#loginButton').textContent = translations[currentLang].login;
    document.querySelector('#registerButton').textContent = translations[currentLang].register;
    document.querySelector('#loginToggle').textContent = translations[currentLang].login;
    document.querySelector('#logoutButton').textContent = translations[currentLang].logout;
    
    // 更新标题和欢迎文本
    document.querySelector('.title').textContent = translations[currentLang].title;
    const welcomeText = document.querySelector('#welcomeText');
    if (welcomeText.textContent !== translations[currentLang].notLogged) {
        const username = welcomeText.textContent.split('，')[1] || welcomeText.textContent.split(', ')[1];
        welcomeText.textContent = translations[currentLang].welcome + username;
    } else {
        welcomeText.textContent = translations[currentLang].notLogged;
    }
    
    // 更新输入区域
    document.querySelector('.prompt-input').placeholder = translations[currentLang].promptPlaceholder;
    document.querySelector('.send-button').textContent = translations[currentLang].send;
    document.querySelector('.clear-button').textContent = translations[currentLang].clearChat;
    
    // 更新右侧面板
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.querySelector('p:first-child').textContent = translations[currentLang].uploadText;
    uploadArea.querySelector('p:nth-child(2)').textContent = translations[currentLang].uploadOr;
    uploadArea.querySelector('button').textContent = translations[currentLang].uploadButton;
    
    // 更新模型选择区域
    document.querySelector('.model-section h3').textContent = translations[currentLang].vectorization;
    document.querySelectorAll('.model-select-group h4')[0].textContent = translations[currentLang].llmModel;
    document.querySelectorAll('.model-select-group h4')[1].textContent = translations[currentLang].embeddingModel;
    
    // 更新提示文本
    const notes = document.querySelectorAll('.notes p');
    notes[0].textContent = translations[currentLang].note1;
    notes[1].textContent = translations[currentLang].note2;
    
    // 更新历史记录相关文本
    document.querySelector('.history-button').textContent = translations[currentLang].chatHistory;
    document.querySelector('.history-modal-header h3').textContent = translations[currentLang].chatHistory;
    
    // 更新所有复制按钮
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.textContent = translations[currentLang].copyButton;
    });
}

// 复制按钮功能
document.querySelectorAll('.copy-btn').forEach(button => {
    button.addEventListener('click', function() {
        const text = this.parentElement.textContent.trim();
        navigator.clipboard.writeText(text).then(() => {
            alert(translations[currentLang].copied);
        });
    });
});

// 清空控制台功能
document.querySelector('.clear-button').addEventListener('click', function() {
    document.querySelector('.chat-container').innerHTML = 
        `<div class="chatbot-label"><span>${translations[currentLang].chatbot}</span></div>`;
});

// 添加语言切换按钮事件监听
document.getElementById('langToggle').addEventListener('click', toggleLanguage);

// 确保在文件末尾正确添加事件监听
document.addEventListener('DOMContentLoaded', () => {
    const langToggleBtn = document.getElementById('langToggle');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', toggleLanguage);
    }
});