// Add this file to your extension
chrome.runtime.onInstalled.addListener(() => {
  // This will prompt the user to enter their API key on first install
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (!result.geminiApiKey) {
      chrome.tabs.create({
        url: "options.html",
      });
    }
  });
});


chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateText",
    title: "Translate '%s'",
    contexts: ["selection"]
  });
});

// Translate selected text
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "translateText" && info.selectionText) {
    const selectedText = info.selectionText;

    chrome.storage.sync.get('targetLanguage', async (data) => {
      const targetLanguage = data.targetLanguage || 'en';

      // check if the tab is valid and has an ID
      if (!tab || !tab.id) {
        console.error("Invalid tab or tab ID.");
        return;
      };

      // log the selected text and target language
      console.log('Background script - Sending message to tab ID:', tab.id, 'with action:', 'translate');
      console.log('Background script - Selected text:', selectedText);
      console.log('Background script - Target language:', targetLanguage);
      console.log("Active tab URL:", tab.url);

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          files: ["content.js"]
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Error injecting content script:", chrome.runtime.lastError);
          } else {
            console.log("Content script injected successfully.");
          }

          // send message after injection of content.js
          chrome.tabs.sendMessage(
            tab.id, { action: "translate", text: selectedText, targetLanguage: targetLanguage },
            function (response) {
              if (chrome.runtime.lastError) {
                console.error('Background script - Error sending message:', chrome.runtime.lastError);
              } else {
                console.log('Background script - Response received:', response);
              }
            });
        }
      );



    });

  }
});


// TODO:
// // Summarize selected text

// chrome.runtime.onInstalled.addListener(() => {
//   chrome.contextMenus.create({
//     id: "summarizeText",
//     title: "Summarize selected text",
//     contexts: ["selection"]
//   });
// });



// chrome.contextMenus.onClicked.addListener(async (info, tab) => {
//   if (info.menuItemId === "summarizeText" && info.selectionText) {
//     const selectedText = info.selectionText;

//     // Check if the tab is valid and has an ID
//     if (!tab || !tab.id) {
//       console.error("Invalid tab or tab ID.");
//       return;
//     }

//     console.log("Background script - Sending message to tab ID:", tab.id, "with action:", "summarize");
//     console.log("Background script - Selected text:", selectedText);

//     // Inject the content script if not already injected
//     chrome.scripting.executeScript(
//       {
//         target: { tabId: tab.id },
//         files: ["content.js"]
//       },
//       () => {
//         if (chrome.runtime.lastError) {
//           console.error("Error injecting content script:", chrome.runtime.lastError);
//         } else {
//           console.log("Content script injected successfully.");
//         }

//         // Send the summarize message to the content script
//         chrome.tabs.sendMessage(
//           tab.id,
//           { action: "summarize", text: selectedText },
//           (response) => {
//             if (chrome.runtime.lastError) {
//               console.error("Background script - Error sending message:", chrome.runtime.lastError);
//             } else {
//               console.log("Background script - Response received:", response);
//             }
//           }
//         );
//       }
//     );
//   }
// });