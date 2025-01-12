chrome.runtime.onInstalled.addListener(() => {
    console.log("Service Worker Registered!");
  });
  
  chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
  });
  