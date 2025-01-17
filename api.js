const BASE_URL = 'http://localhost:80';

const API = {
    login: `${BASE_URL}/login`,
    register: `${BASE_URL}/register`, 
    upload: `${BASE_URL}/upload`,
    chat: `${BASE_URL}/chat`,
    info: `${BASE_URL}/info`,
    db: `${BASE_URL}/db`,
    history: `${BASE_URL}/history`
};
export { API };
// 统一处理API请求
async function request(url, options = {}) {
    try {
        console.log('请求 URL:', url); // 调试日志
        const response = await fetch(url, {
            ...options,
            headers: 
            {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        return await response.json();
    } catch (error) {
        console.error('API请求错误:', error);
        throw error;
    }
}

// API方法
const apiService = {
    // 登录
    login: (username, password) => {
        return request(API.login, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },

    // 注册
    register: (username, password) => {
        return request(API.register, {
            method: 'POST', 
            body: JSON.stringify({ username, password })
        });
    },

    // 上传文件
    upload: async (formData) => {
        try {
            const response = await fetch(API.upload, {
                method: 'POST',
                mode: 'cors',
                body: formData
            });

            // 打印原始响应
            console.log('上传响应状态:', response.status);
            const responseText = await response.text();
            console.log('上传响应内容:', responseText);

            // 尝试解析 JSON
            try {
                const data = JSON.parse(responseText);
                return {
                    success: true,
                    data: data
                };
            } catch (e) {
                console.error('JSON解析错误:', e);
                return {
                    success: false,
                    message: responseText
                };
            }
        } catch (error) {
            console.error('上传请求错误:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },

    // 聊天
    chat: (formData) => {
        return fetch(API.chat, {
            method: 'POST',
            mode: 'cors',
            body: formData
        }).then(response => response.json());
    },

    // 获取模型信息
    getInfo: () => {
        return request(API.info, {
            method: 'POST'
        });
    },

    // 获取数据库信息
    getDbInfo: (username) => {
        return request(API.db, {
            method: 'POST',
            body: JSON.stringify({ username })
        });
    },

    // 获取历史记录
    getHistory: (formData) => {
        return fetch(API.history, {
            method: 'POST',
            mode: 'cors',
            body: formData
        }).then(response => response.json());
    }
};

export default apiService;
