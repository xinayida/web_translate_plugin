// 全局存储已翻译的元素和待翻译的元素
let translatedElements = [];
let pendingElements = [];
const TRANSLATION_CLASS = 'ai-web-translator-result';
const LOADING_CLASS = 'ai-web-translator-loading';
const RETRY_CLASS = 'ai-web-translator-retry';

// 监听来自弹出窗口的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'translate') {
    translatePage(request.targetLanguage, request.apiKey, request.apiModel);
  } else if (request.action === 'clear') {
    clearTranslations();
  }
});

// 翻译页面内容
async function translatePage(targetLanguage, apiKey, apiModel) {
  // 检查是否已经有翻译，如果有则先清除
  clearTranslations();
  
  // 获取页面中所有段落、标题等文字内容
  const textElements = findTextElements();
  pendingElements = [...textElements];
  
  // 显示总体进度提示
  showLoadingOverlay();
  
  try {
    // 逐个处理每个元素
    for (let i = 0; i < pendingElements.length; i++) {
      const element = pendingElements[i];
      if (!element) continue;
      
      // 显示单个元素的loading状态
      showElementLoading(element);
      
      try {
        // 调用API进行翻译
        const translatedText = await translateText(element.textContent.trim(), targetLanguage, apiKey, apiModel);
        
        // 移除loading状态并添加翻译结果
        removeElementLoading(element);
        appendTranslation(element, translatedText);
        
        // 更新总体进度
        updateLoadingProgress(Math.round(((i + 1) / pendingElements.length) * 100));
      } catch (error) {
        console.error('翻译元素失败:', error);
        // 显示重试按钮
        showRetryButton(element, () => retryTranslation(element, targetLanguage, apiKey, apiModel));
      }
    }
    
    // 显示完成提示
    showCompletionMessage();
  } catch (error) {
    console.error('翻译过程中出错:', error);
    alert('翻译失败: ' + error.message);
  } finally {
    // 隐藏总体进度提示
    hideLoadingOverlay();
  }
}

// 重试单个元素的翻译
async function retryTranslation(element, targetLanguage, apiKey, apiModel) {
  showElementLoading(element);
  try {
    const translatedText = await translateText(element.textContent.trim(), targetLanguage, apiKey, apiModel);
    removeElementLoading(element);
    appendTranslation(element, translatedText);
  } catch (error) {
    console.error('重试翻译失败:', error);
    showRetryButton(element, () => retryTranslation(element, targetLanguage, apiKey, apiModel));
  }
}

// 显示元素的loading状态
function showElementLoading(element) {
  const loadingElement = document.createElement('div');
  loadingElement.className = LOADING_CLASS;
  loadingElement.innerHTML = '<div class="loading-spinner"></div>';
  loadingElement.style.cssText = `
    padding: 8px;
    margin-top: 5px;
    background-color: #f8f9fa;
    border-left: 3px solid #4285f4;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #4285f4;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
  
  element.parentNode.insertBefore(loadingElement, element.nextSibling);
  translatedElements.push(loadingElement);
}

// 移除元素的loading状态
function removeElementLoading(element) {
  const loadingElement = element.nextElementSibling;
  if (loadingElement && loadingElement.classList.contains(LOADING_CLASS)) {
    loadingElement.remove();
    translatedElements = translatedElements.filter(el => el !== loadingElement);
  }
}

// 显示重试按钮
function showRetryButton(element, retryCallback) {
  const retryElement = document.createElement('div');
  retryElement.className = RETRY_CLASS;
  retryElement.innerHTML = `
    <button style="
      padding: 8px 16px;
      background-color: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    ">重试翻译</button>
  `;
  
  retryElement.querySelector('button').addEventListener('click', retryCallback);
  
  element.parentNode.insertBefore(retryElement, element.nextSibling);
  translatedElements.push(retryElement);
}

// 显示完成提示
function showCompletionMessage() {
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: #28a745;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 9999;
    font-family: Arial, sans-serif;
  `;
  message.textContent = '翻译完成！';
  document.body.appendChild(message);
  
  setTimeout(() => {
    message.remove();
  }, 3000);
}

// 查找页面中所有文本元素
function findTextElements() {
  // 获取所有可能包含文本的元素
  const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, span, div');
  
  // 过滤出直接包含文本的元素，排除只有空白符或没有文本的元素
  return Array.from(elements).filter(el => {
    // 排除已有翻译的元素、脚本和样式元素
    if (el.classList.contains(TRANSLATION_CLASS) || 
        el.tagName === 'SCRIPT' || 
        el.tagName === 'STYLE') {
      return false;
    }
    
    // 检查元素是否直接包含非空文本
    const hasDirectText = Array.from(el.childNodes)
      .some(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0);
    
    // 检查可见性
    const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
    
    return hasDirectText && isVisible;
  });
}

// 修改translateTexts函数为translateText
async function translateText(text, targetLanguage, apiKey, apiModel) {
  // 根据模型选择确定API提供商和基础URL
  let apiUrl = 'https://api.openai.com/v1/chat/completions';
  let apiKeyToUse = apiKey;
  
  // 根据选定的模型设置不同的API端点
  if (apiModel === 'deepseek-chat') {
    apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  } else if (apiModel === 'grok-2-latest') {
    apiUrl = 'https://api.x.ai/v1/chat/completions';
  } else if (apiModel === 'deepseek-v3-241226') {
    apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  }
  
  // 构建语言提示
  let languagePrompt;
  switch (targetLanguage) {
    case 'zh': languagePrompt = '中文'; break;
    case 'en': languagePrompt = 'English'; break;
    case 'ja': languagePrompt = '日本語'; break;
    case 'ko': languagePrompt = '한국어'; break;
    case 'fr': languagePrompt = 'Français'; break;
    case 'de': languagePrompt = 'Deutsch'; break;
    case 'es': languagePrompt = 'Español'; break;
    case 'ru': languagePrompt = 'Русский'; break;
    default: languagePrompt = '中文';
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKeyToUse}`
    },
    body: JSON.stringify({
      model: apiModel,
      messages: [
        {
          role: 'system',
          content: `你是一位专业翻译，精通多种语言。请将以下文本翻译成${languagePrompt}。请只返回翻译结果，不要添加任何额外信息。`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API请求失败: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// 将翻译结果添加到元素下方
function appendTranslation(element, translatedText) {
  // 创建翻译结果元素
  const translationElement = document.createElement('div');
  translationElement.className = TRANSLATION_CLASS;
  translationElement.style.cssText = `
    padding: 8px;
    margin-top: 5px;
    background-color: #f0f9ff;
    border-left: 3px solid #4285f4;
    font-style: italic;
    color: #333;
  `;
  translationElement.textContent = translatedText;
  
  // 添加到原元素后面
  element.parentNode.insertBefore(translationElement, element.nextSibling);
  
  // 记录已翻译的元素
  translatedElements.push(translationElement);
}

// 清除所有翻译
function clearTranslations() {
  translatedElements.forEach(el => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });
  
  translatedElements = [];
}

// 显示加载提示
function showLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'ai-translator-loading';
  overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
  `;
  
  const text = document.createElement('div');
  text.textContent = '翻译中...';
  text.style.marginBottom = '10px';
  
  const progressContainer = document.createElement('div');
  progressContainer.style.cssText = `
    width: 100%;
    background-color: #444;
    border-radius: 3px;
    overflow: hidden;
  `;
  
  const progressBar = document.createElement('div');
  progressBar.id = 'ai-translator-progress';
  progressBar.style.cssText = `
    width: 0%;
    height: 5px;
    background-color: #4285f4;
    transition: width 0.3s;
  `;
  
  progressContainer.appendChild(progressBar);
  overlay.appendChild(text);
  overlay.appendChild(progressContainer);
  document.body.appendChild(overlay);
}

// 更新加载进度
function updateLoadingProgress(percentage) {
  const progressBar = document.getElementById('ai-translator-progress');
  if (progressBar) {
    progressBar.style.width = percentage + '%';
  }
}

// 隐藏加载提示
function hideLoadingOverlay() {
  const overlay = document.getElementById('ai-translator-loading');
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
} 