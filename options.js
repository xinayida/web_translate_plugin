document.addEventListener('DOMContentLoaded', function() {
  // 获取DOM元素
  const apiKeyInput = document.getElementById('api-key');
  const deepseekApiKeyInput = document.getElementById('deepseek-api-key');
  const grokApiKeyInput = document.getElementById('grok-api-key');
  const huoshanApiKeyInput = document.getElementById('huoshan-api-key');
  const apiModelSelect = document.getElementById('api-model');
  const saveButton = document.getElementById('save-btn');
  const statusDiv = document.getElementById('status');
  
  // 从存储中加载设置
  chrome.storage.sync.get(
    ['apiKey', 'deepseekApiKey', 'grokApiKey', 'huoshanApiKey', 'apiModel'], 
    function(data) {
      if (data.apiKey) {
        apiKeyInput.value = data.apiKey;
      }
      
      if (data.deepseekApiKey) {
        deepseekApiKeyInput.value = data.deepseekApiKey;
      }
      
      if (data.grokApiKey) {
        grokApiKeyInput.value = data.grokApiKey;
      }
      
      if (data.huoshanApiKey) {
        huoshanApiKeyInput.value = data.huoshanApiKey;
      }
      
      if (data.apiModel) {
        apiModelSelect.value = data.apiModel;
      }
    }
  );
  
  // 保存设置
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    const deepseekApiKey = deepseekApiKeyInput.value.trim();
    const grokApiKey = grokApiKeyInput.value.trim();
    const huoshanApiKey = huoshanApiKeyInput.value.trim();
    const apiModel = apiModelSelect.value;
    
    // 验证所选模型对应的API密钥
    let hasError = false;
    if (apiModel.startsWith('gpt') && !apiKey) {
      showStatus('请输入 OpenAI API 密钥', 'error');
      hasError = true;
    } else if (apiModel === 'deepseek-chat' && !deepseekApiKey) {
      showStatus('请输入 Deepseek API 密钥', 'error');
      hasError = true;
    } else if (apiModel === 'grok-2-latest' && !grokApiKey) {
      showStatus('请输入 Grok API 密钥', 'error');
      hasError = true;
    } else if (apiModel === 'deepseek-v3-241226' && !huoshanApiKey) {
      showStatus('请输入火山大模型 API 密钥', 'error');
      hasError = true;
    }
    
    if (hasError) {
      return;
    }
    
    // 保存到Chrome存储
    chrome.storage.sync.set({
      'apiKey': apiKey,
      'deepseekApiKey': deepseekApiKey,
      'grokApiKey': grokApiKey,
      'huoshanApiKey': huoshanApiKey,
      'apiModel': apiModel
    }, function() {
      showStatus('设置已保存', 'success');
    });
  });
  
  // 显示状态消息
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    
    // 3秒后隐藏状态消息
    setTimeout(function() {
      statusDiv.className = 'status';
    }, 3000);
  }
}); 