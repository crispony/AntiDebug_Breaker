// 后台脚本 - 管理徽章显示
chrome.storage.local.get(null, (data) => {
    // 初始化存储结构
    Object.keys(data).forEach(hostname => {
        if (Array.isArray(data[hostname])) {
            // 确保计数基于有效的脚本ID
            const validCount = data[hostname].filter(
                id => typeof id === 'string' && id.trim() !== ''
            ).length;

            updateBadgeForHostname(hostname, validCount);
        }
    });
});

// 监听存储变化并同步到所有标签页
chrome.storage.onChanged.addListener((changes, namespace) => {
    for (let [key, {newValue}] of Object.entries(changes)) {
        if (namespace === 'local' && Array.isArray(newValue)) {
            // 更新徽章
            updateBadgeForHostname(key, newValue.length);

            // 同步到所有标签页的localStorage
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    if (tab.url) {
                        try {
                            const tabHostname = new URL(tab.url).hostname;
                            if (tabHostname === key) {
                                chrome.scripting.executeScript({
                                    target: {tabId: tab.id},
                                    func: (hostname, scripts) => {
                                        try {
                                            const storageData = localStorage.getItem('AntiDebug_Breaker') || '{}';
                                            const parsed = JSON.parse(storageData);
                                            parsed[hostname] = scripts;
                                            localStorage.setItem('AntiDebug_Breaker', JSON.stringify(parsed));
                                        } catch (e) {
                                            console.warn('[AntiDebug] Failed to update localStorage', e);
                                        }
                                    },
                                    args: [key, newValue]
                                });
                            }
                        } catch (e) {
                            // 忽略URL解析错误
                        }
                    }
                });
            });
        }
    }
});

// 监听标签切换事件
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url) {
            updateBadgeForTab(tab);
        }
    });
});

// 监听标签URL变化
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // 页面加载完成时更新徽章
    if (changeInfo.status === 'complete') {
        updateBadgeForTab(tab);
    }
});

// 处理消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'tab_updated') {
        updateBadgeForTab(message.tab);
    }
});

// 更新标签页徽章
function updateBadgeForTab(tab) {
    if (!tab.url) return;

    try {
        const hostname = new URL(tab.url).hostname;

        // 获取存储中的启用状态
        chrome.storage.local.get([hostname], (result) => {
            const enabledScripts = result[hostname] || [];

            // 过滤掉无效的脚本ID
            const validCount = enabledScripts.filter(
                id => typeof id === 'string' && id.trim() !== ''
            ).length;

            // 更新徽章
            updateBadge(tab.id, validCount);
        });
    } catch (error) {
        console.error('Error updating badge for tab:', tab, error);
    }
}

// 更新特定域名的徽章
function updateBadgeForHostname(hostname, count) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url) {
                try {
                    const tabHostname = new URL(tab.url).hostname;
                    if (tabHostname === hostname) {
                        updateBadge(tab.id, count);
                    }
                } catch (e) {
                    // 忽略URL解析错误
                }
            }
        });
    });
}

// 设置徽章文本
function updateBadge(tabId, count) {
    if (count > 0) {
        chrome.action.setBadgeText({text: count.toString(), tabId});
        chrome.action.setBadgeBackgroundColor({color: '#4688F1', tabId});
    } else {
        chrome.action.setBadgeText({text: '', tabId});
    }
}