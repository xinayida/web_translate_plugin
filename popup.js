document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const translateBtn = document.getElementById('translate-btn');
  const clearBtn = document.getElementById('clear-btn');
  const languageSelect = document.getElementById('target-language');
  const optionsLink = document.getElementById('open-options');
  
  // 从存储中加载上次选择的语言
  chrome.storage.sync.get('targetLanguage', function(data) {
    if (data.targetLanguage) {
      languageSelect.value = data.targetLanguage;
    }
  });
  
  // 保存语言选择
  languageSelect.addEventListener('change', function() {
    chrome.storage.sync.set({ 'targetLanguage': languageSelect.value });
  });
  
  // 翻译按钮点击事件
  translateBtn.addEventListener('click', function() {
    // 获取当前语言
    const targetLanguage = languageSelect.value;
    
    // 检查是否已设置API密钥
    chrome.storage.sync.get(
      ['apiKey', 'deepseekApiKey', 'grokApiKey', 'huoshanApiKey', 'apiModel'], 
      function(data) {
        const apiModel = data.apiModel || 'gpt-3.5-turbo';
        let apiKey = '';
        
        // 根据所选模型选择对应的API密钥
        if (apiModel.startsWith('gpt')) {
          apiKey = data.apiKey;
          if (!apiKey) {
            alert('请先在设置中配置 OpenAI API 密钥');
            chrome.runtime.openOptionsPage();
            return;
          }
        } else if (apiModel === 'deepseek-chat') {
          apiKey = data.deepseekApiKey;
          if (!apiKey) {
            alert('请先在设置中配置 Deepseek API 密钥');
            chrome.runtime.openOptionsPage();
            return;
          }
        } else if (apiModel === 'grok-2-latest') {
          apiKey = data.grokApiKey;
          if (!apiKey) {
            alert('请先在设置中配置 Grok API 密钥');
            chrome.runtime.openOptionsPage();
            return;
          }
        } else if (apiModel === 'deepseek-v3-241226') {
          apiKey = data.huoshanApiKey;
          if (!apiKey) {
            alert('请先在设置中配置火山大模型 API 密钥');
            chrome.runtime.openOptionsPage();
            return;
          }
        }
        
        // 向当前标签页发送翻译命令
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          const activeTab = tabs[0];
          chrome.tabs.sendMessage(activeTab.id, {
            action: 'translate',
            targetLanguage: targetLanguage,
            apiKey: apiKey,
            apiModel: apiModel
          });
        });
      }
    );
  });
  
  // 清除翻译按钮点击事件
  clearBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {
        action: 'clear'
      });
    });
  });
  
  // 打开选项页面
  optionsLink.addEventListener('click', function(e) {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}); 