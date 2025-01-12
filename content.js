(async function () {
  console.log('Chatbot started.');

  const swearWords = ['badword1', 'badword2', 'badword3']; // Replace with actual swear words

  // Function to filter swear words
  const filterSwears = (text) => {
    let filteredText = text;
    swearWords.forEach((swear) => {
      const regex = new RegExp(swear, 'gi');
      filteredText = filteredText.replace(regex, '****');
    });
    return filteredText;
  };

  // Function to wait for an element to appear in the DOM
  const waitForElement = async (selector, timeout = 10000) => {
    let elapsedTime = 0;
    while (!document.querySelector(selector) && elapsedTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      elapsedTime += 500;
    }
    return document.querySelector(selector);
  };

  // Select the chat container and initiate the observation
  const chatContainer = await waitForElement('[role="main"]', 10000);
  if (!chatContainer) {
    console.error('Chat container not found.');
    return;
  }

  console.log('Chat container found!');

  let lastRequestTime = 0;
  let messageHistory = []; // Stack to store message history
  let debounceTimer; // Timer for debouncing suggestion fetch
  let isMinimized = false; // To track minimize state

  // Mutation observer to track new messages in the chat
  const observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        const newMessageNode = Array.from(mutation.addedNodes).find(node => node.innerText);
        if (newMessageNode) {
          const newMessage = newMessageNode.innerText.trim();
          console.log('New message detected:', newMessage);

          messageHistory.push(newMessage); // Add new message to the stack

          // Debounce: Stop firing fetch requests until there is inactivity for 2 seconds
          clearTimeout(debounceTimer); // Clear previous timer if new message is detected
          debounceTimer = setTimeout(async () => {
            const currentTime = Date.now();
            if (currentTime - lastRequestTime >= 60000) { // Check cooldown
              lastRequestTime = currentTime;

              // Fetch suggestions based on the accumulated message stack
              const suggestions = await getChatGPTSuggestions(messageHistory);
              console.log('Suggestions:', suggestions);
              displaySuggestions(suggestions);
            }
          }, 2000); // Delay to avoid triggering too frequently
        }
      }
    }
  });

  observer.observe(chatContainer, { childList: true, subtree: true });

  // Function to get suggestions from OpenAI's API
  async function getChatGPTSuggestions(messageHistory) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer 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`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: "You are an AI assistant providing concise responses to previous messages based on chat context and You should reply to the most recent one and reply as if you were the one sending the message but also never admit to being an AI . Any messages that begin with 'You sent' are ones that you sent any other are ones you should reply to, you must never take the role of the other person"
            },
            ...messageHistory.map((message) => ({
              role: 'user',
              content: message
            })),
          ],
          max_tokens: 150,
          n: 3, // Request 3 suggestions
        }),
      });

      const data = await response.json();
      console.log('API response:', data);
      const suggestions = data.choices && data.choices.map(choice => choice.message.content.trim()).filter(content => content) || [];

      // Filter out swear words from the suggestions
      return suggestions.map(filterSwears);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  }

  // Function to display suggestions and the "Generate More Responses" button
  function displaySuggestions(suggestions) {
    const inputBox = document.querySelector('[contenteditable="true"]');
    if (!inputBox) {
      console.error('Input box not found.');
      return;
    }

    // Remove existing suggestions
    const existingContainer = document.querySelector('#suggestion-container');
    if (existingContainer) {
      existingContainer.remove();
    }

    // Create suggestion container
    const suggestionContainer = document.createElement('div');
    suggestionContainer.id = 'suggestion-container';
    suggestionContainer.style.position = 'absolute';
    suggestionContainer.style.bottom = '60px';
    suggestionContainer.style.left = '20px';
    suggestionContainer.style.backgroundColor = '#fff';
    suggestionContainer.style.border = '1px solid #ccc';
    suggestionContainer.style.padding = '10px';
    suggestionContainer.style.borderRadius = '8px';
    suggestionContainer.style.zIndex = '1000';
    suggestionContainer.style.transition = 'height 0.3s ease-in-out';

    // Create minimize button
    const minimizeButton = document.createElement('button');
    minimizeButton.innerText = 'Minimize';
    minimizeButton.style.position = 'absolute';
    minimizeButton.style.top = '5px';
    minimizeButton.style.right = '5px';
    minimizeButton.style.border = 'none';
    minimizeButton.style.backgroundColor = '#f0f0f0';
    minimizeButton.style.color = '#007bff';
    minimizeButton.style.cursor = 'pointer';
    minimizeButton.style.padding = '5px 10px';
    minimizeButton.addEventListener('click', () => {
      isMinimized = !isMinimized;
      suggestionContainer.style.height = isMinimized ? '50px' : 'auto'; // Minimize the container
      suggestionContainer.style.display = isMinimized ? 'none' : 'block'; // Hide suggestions when minimized
    });

    suggestionContainer.appendChild(minimizeButton);

    // Create buttons for each suggestion
    suggestions.forEach((suggestion) => {
      const button = document.createElement('button');
      button.innerText = suggestion;
      button.style.margin = '5px';
      button.style.padding = '8px 12px';
      button.style.cursor = 'pointer';
      button.style.border = 'none';
      button.style.backgroundColor = '#007bff';
      button.style.color = '#fff';
      button.style.borderRadius = '4px';

      button.addEventListener('click', () => {
        inputBox.innerText = suggestion;
        inputBox.dispatchEvent(new Event('input', { bubbles: true }));

        // Trigger the "send" button to simulate sending the message
        const sendButton = document.querySelector('button[type="submit"]');  // Adjust selector based on the actual send button
        if (sendButton) {
          sendButton.click();
        } else {
          console.error('Send button not found.');
        }
      });

      suggestionContainer.appendChild(button);
    });

    // Add the "Generate More Responses" button
    const generateMoreButton = document.createElement('button');
    generateMoreButton.innerText = 'Generate More Responses';
    generateMoreButton.style.marginTop = '10px';
    generateMoreButton.style.padding = '8px 12px';
    generateMoreButton.style.cursor = 'pointer';
    generateMoreButton.style.border = 'none';
    generateMoreButton.style.backgroundColor = '#28a745';
    generateMoreButton.style.color = '#fff';
    generateMoreButton.style.borderRadius = '4px';

    generateMoreButton.addEventListener('click', async () => {
      // Fetch new suggestions for the latest message
      const newSuggestions = await getChatGPTSuggestions([messageHistory[messageHistory.length - 1]]);
      console.log('New Suggestions after clicking "Generate More Responses":', newSuggestions);

      // Display the new set of suggestions without resetting history
      displaySuggestions(newSuggestions);
    });

    suggestionContainer.appendChild(generateMoreButton);

    document.body.appendChild(suggestionContainer);
  }

  // Listen for any chat switch (e.g., a change in the chat container)
  let currentChat = chatContainer;
  const chatSwitcherObserver = new MutationObserver(async () => {
    const newChatContainer = await waitForElement('[role="main"]', 1000);
    if (newChatContainer && newChatContainer !== currentChat) {
      currentChat = newChatContainer;
      messageHistory = []; // Reset the message history for the new chat
      console.log('Switched to a new chat. Resetting message history.');
      displaySuggestions([]); // Clear suggestions
    }
  });

  chatSwitcherObserver.observe(document.body, { childList: true, subtree: true });

})();
