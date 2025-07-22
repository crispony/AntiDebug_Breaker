// 在document_start阶段执行
(() => {
    // 立即注入脚本，不等待存储加载
    const injectScriptsImmediately = (scriptIds) => {
        scriptIds.forEach(scriptId => {
            try {
                const scriptURL = chrome.runtime.getURL(`scripts/${scriptId}.js`);
                const script = document.createElement('script');
                script.src = scriptURL;
                script.setAttribute('data-injected-by', 'AntiDebug_Breaker');

                // 使用document.head或document.documentElement确保最快注入
                (document.head || document.documentElement).appendChild(script);
            } catch (error) {
                console.error(`[AntiDebug] Failed to inject script ${scriptId}:`, error);
            }
        });
    };

    // 优先从本地存储获取启用状态
    const getEnabledScripts = () => {
        try {
            const hostname = window.location.hostname;
            const storageData = localStorage.getItem('AntiDebug_Breaker');
            if (storageData) {
                const parsed = JSON.parse(storageData);
                return parsed[hostname] || [];
            }
        } catch (e) {
            console.warn('[AntiDebug] Failed to read localStorage', e);
        }
        return [];
    };

    // 第一步：立即注入本地存储中启用的脚本
    const enabledScripts = getEnabledScripts().filter(
        id => typeof id === 'string' && id.trim() !== ''
    );

    injectScriptsImmediately(enabledScripts);

    // 第二步：从扩展存储获取最新状态
    const hostname = window.location.hostname;

    chrome.storage.local.get([hostname], (result) => {
        const latestEnabledScripts = result[hostname] || [];

        // 过滤掉无效的脚本ID
        const validScripts = latestEnabledScripts.filter(
            id => typeof id === 'string' && id.trim() !== ''
        );

        // 比较差异，注入新启用的脚本
        const newScripts = validScripts.filter(id => !enabledScripts.includes(id));
        injectScriptsImmediately(newScripts);

        // 更新本地存储
        try {
            const storageData = localStorage.getItem('AntiDebug_Breaker') || '{}';
            const parsed = JSON.parse(storageData);
            parsed[hostname] = validScripts;
            localStorage.setItem('AntiDebug_Breaker', JSON.stringify(parsed));
        } catch (e) {
            console.warn('[AntiDebug] Failed to update localStorage', e);
        }

        // 通知后台更新徽章
        chrome.runtime.sendMessage({
            type: 'tab_updated',
            tab: {url: window.location.href}
        });
    });

    // 监听来自popup的更新
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'scripts_updated' && message.hostname === hostname) {
            // 直接注入新启用的脚本
            injectScriptsImmediately(message.enabledScripts);

            // 更新本地存储
            try {
                const storageData = localStorage.getItem('AntiDebug_Breaker') || '{}';
                const parsed = JSON.parse(storageData);
                parsed[hostname] = message.enabledScripts;
                localStorage.setItem('AntiDebug_Breaker', JSON.stringify(parsed));
            } catch (e) {
                console.warn('[AntiDebug] Failed to update localStorage', e);
            }
        }
    });
})();