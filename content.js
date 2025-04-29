// content.js

// // simple listner for debugging purposes
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "translate") {
//     console.log("Content script received message:", message);
//     // Handle the translation logic here
//     sendResponse({ status: "Translation received" });
//   }
// });

// listen for translate action request from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === "translate" && request.text && request.targetLanguage) {
    const textToTranslate = request.text;
    const targetLanguage = request.targetLanguage;



    // 1. get the user's API key from storage
    chrome.storage.sync.get(["geminiApiKey"], async ({ geminiApiKey }) => {
      if (!geminiApiKey) {
        // If the API key is not set, prompt the user to enter it
        alert("Please set your Gemini API key in the options page.");

        // Open the options page to allow the user to enter their API key
        chrome.runtime.openOptionsPage();

        sendResponse({ status: "error", message: "API key not set" });
        return;
      }

      // 2. Call the translation function with the text and target language
      try {

        console.log("Gemini API Key retrieved:", geminiApiKey);

        // Call the translation function with the text and target language
        const translation = await translate_with_Gemini(
          textToTranslate,
          targetLanguage,
          geminiApiKey
        );

        // Handle the translation result
        console.log("Translation Result:", translation);

        // Send a response back to the background script
        sendResponse({ status: "success", translation });
        // alert(`Translation: ${translation}`);
        // openPopupWithTranslation(`Translation: ${translation}`);
        injectPopup(`${translation}`);

      } catch (error) {
        console.error("Error during translation:", error);
        // alert(`Translation failed: ${error.message}`);
        // showPopup(`Translation failed: ${error.message}`);
        // Send a response back to the background script
        sendResponse({ status: "error", message: error.message });
      }


    });

    // Keep the message channel open for async response
    return true;
  }


});

// Function to get the translation from Gemini
async function translate_with_Gemini(text, targetLanguage, apiKey) {
  // Truncate very long texts to avoid API limits (typically around 30K tokens)
  const maxLength = 500;
  const truncatedText =
    text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

  let prompt;
  prompt = `
  You are a translation engine. Only output exactly what’s asked—no introductory or summary text.
  Remember that user knows ${targetLanguage}, but not the original language of word(s) "${truncatedText}".
  if "${truncatedText}" is a couple words:
  Translate following word(s) "${truncatedText}" into ${targetLanguage}, and provide:
  The word(s) pronunciation in original language, and some bilingual example sentences
  
  Example which translates "understanding" (English is the original language) into simplified Chinese (the target language):
  understanding [ˈʌndərˈstændɪŋ] (理解；谅解；协议；领悟) 
   - I have an understanding of the situation. (我了解情况。) 
   - We have a mutual understanding. (我们有共同的谅解。) 
   - There was an understanding between them. (他们之间有个协议。) 
   - His understanding of the problem is profound. (他对这个问题的理解很深刻。)

  if ${truncatedText} a sentence, just translate "${truncatedText}" into ${targetLanguage}.  `;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No translation available."
    );
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to translate. Please try again later.");
  }
}

// Function to inject the popup into the current tab
function injectPopup(translation) {
  // // Ensure the Marked.js library is loaded
  // await loadMarkedLibrary();

  console.log("Marked.js loaded:", typeof marked !== "undefined"); // Should log "true"

  const existingPopup = document.getElementById("translation-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.id = "translation-popup";
  popup.style.position = "fixed";
  popup.style.bottom = "20px";
  popup.style.right = "20px";
  popup.style.backgroundColor = "#ffffff"; // White background
  popup.style.border = "1px solid #ccc";
  popup.style.borderRadius = "8px";
  popup.style.padding = "15px";
  popup.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
  popup.style.zIndex = "10000";
  popup.style.maxWidth = "600px"; // Wider box
  popup.style.maxHeight = "150px"; // Shorter height
  popup.style.overflowY = "auto"; // Enable vertical scroll
  popup.style.fontFamily = "Arial, sans-serif";
  popup.style.fontSize = "14px";
  popup.style.color = "#333";

  // // show the translation as plain text
  // const text = document.createElement("p");
  // text.textContent = translation;
  // text.style.margin = "0 0 10px 0";
  // popup.appendChild(text);

  // Convert Markdown to HTML using marked.js
  const htmlContent = marked.parse(translation);

  // Add the parsed HTML content
  const content = document.createElement("div");
  content.innerHTML = htmlContent;
  content.style.margin = "0 0 10px 0";
  popup.appendChild(content);

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.backgroundColor = "#007bff";
  closeButton.style.color = "#fff";
  closeButton.style.border = "none";
  closeButton.style.borderRadius = "4px";
  closeButton.style.padding = "5px 10px";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontSize = "12px";

  closeButton.addEventListener("click", () => {
    popup.remove();
  });

  popup.appendChild(closeButton);

  document.body.appendChild(popup);

}


// TODO:

// // listen for summarize action request from background.js
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "summarize" && request.text) {
//     const selectedText = request.text;

//     console.log("Content script - Received text to summarize:", selectedText);

//     // Generate a summary (replace this with your actual summary logic)
//     const summary = generateSummary(selectedText);

//     // Display the summary in a popup
//     injectPopup(summary);

//     sendResponse({ status: "success", summary });
//   }
// });

// // function to get the summary from Gemini
// async function getGeminiSummary(text, summaryType, apiKey) {
//   // Truncate very long texts to avoid API limits (typically around 30K tokens)
//   const maxLength = 20000;
//   const truncatedText =
//     text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

//   let prompt;
//   switch (summaryType) {
//     case "brief":
//       prompt = `Provide a brief summary of the following article in 2-3 sentences:\n\n${truncatedText}`;
//       break;
//     case "detailed":
//       prompt = `Provide a detailed summary of the following article, covering all main points and key details:\n\n${truncatedText}`;
//       break;
//     case "bullets":
//       prompt = `Summarize the following article in 5-7 key points. Format each point as a line starting with "- " (dash followed by a space). Do not use asterisks or other bullet symbols, only use the dash. Keep each point concise and focused on a single key insight from the article:\n\n${truncatedText}`;
//       break;
//     default:
//       prompt = `Summarize the following article:\n\n${truncatedText}`;
//   }

//   try {
//     const res = await fetch(
//       `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           contents: [
//             {
//               parts: [{ text: prompt }],
//             },
//           ],
//           generationConfig: {
//             temperature: 0.2,
//           },
//         }),
//       }
//     );

//     if (!res.ok) {
//       const errorData = await res.json();
//       throw new Error(errorData.error?.message || "API request failed");
//     }

//     const data = await res.json();
//     return (
//       data?.candidates?.[0]?.content?.parts?.[0]?.text ||
//       "No summary available."
//     );
//   } catch (error) {
//     console.error("Error calling Gemini API:", error);
//     throw new Error("Failed to generate summary. Please try again later.");
//   }
// }