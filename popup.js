document.getElementById('startBtn').addEventListener('click', function () {
    console.log("Start button clicked!");
  
    // Send a message to the background script to activate content script
    chrome.runtime.sendMessage({ action: 'startChatbot' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Message failed:', chrome.runtime.lastError);
      } else {
        console.log('Background response:', response);
      }
    });
  });
  