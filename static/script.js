const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector(".chat-input span");
const versionSelector = document.querySelector(".select-version");

let userMessage = null; // Variable to store user's message
const API_KEY = "PASTE-YOUR-API-KEY"; // Paste your API key here
const inputInitHeight = chatInput.scrollHeight;

const createChatLi = (message, className) => {
    // Create a chat <li> element with passed message and className
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", `${className}`);
    let chatContent = className === "outgoing" ? `<p>${message}</p>` : `<span class="material-symbols-outlined headset-mic">headset_mic</span><p>${message}</p>`;
    chatLi.innerHTML = chatContent;
    return chatLi; // return chat <li> element
}

const generateResponse = async (chatEle) => {
    let API_URL = '/v2/query';
    if(versionSelector.value == "version1"){
        API_URL = '/v1/query';
    }
    const messageElement = chatEle.querySelector("p");

    const requestOptions = {
        method: "POST",
        mode: "no-cors",
        headers: {                        
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            query: userMessage
        })
    }

    // Send POST request to API, get response and set the reponse as paragraph text
    await fetch(API_URL, requestOptions)
    .then(res => res.json())
    .then(data => {
        const sources = data.sources;
        let response = data.response;
        chatEle.innerHTML =`<span class="material-symbols-outlined headset-mic">headset_mic</span>`;
        // Create the main chat element
        const chatElement = document.createElement("div");
        chatElement.className = "chat-element";

        // Create tab container
        const tabContainer = document.createElement("div");
        tabContainer.className = "tab-container";

        // Create tabs and content
        const tabs = [];
        const tabContents = [];

        // Response tab
        const responseTab = document.createElement("div");
        responseTab.className = "tab active";
        responseTab.innerText = "Response";
        tabContainer.appendChild(responseTab);
        tabs.push(responseTab);

        const responseContent = document.createElement("div");
        responseContent.className = "tab-content active";
        const wordLimit = 30;
        responseContent.appendChild(createTabContentElement(response, wordLimit));
        chatElement.appendChild(responseContent);
        tabContents.push(responseContent);

        // Source tabs
        if(typeof sources != 'undefined'){
            sources.forEach((source, index) => {
                if(source.metadata.relevance_score >= 0.01){
                    const tab = document.createElement("div");
                    tab.className = "tab";
                    tab.innerText = `Source ${index + 1}`;
                    tabContainer.appendChild(tab);
                    tabs.push(tab);
    
                    const content = document.createElement("div");
                    content.className = "tab-content";
                    content.appendChild(createSourceTabContentElement(source, 10));
                    chatElement.appendChild(content);
                    tabContents.push(content);
                }
            });
    
            // Add event listeners for tabs
            tabs.forEach((tab, index) => {
                tab.addEventListener("click", () => {
                    tabs.forEach(t => t.classList.remove("active"));
                    tabContents.forEach(tc => tc.classList.remove("active"));
                    tab.classList.add("active");
                    tabContents[index].classList.add("active");
                });
            });
        }
        

        chatElement.insertBefore(tabContainer, chatElement.firstChild);
        chatElement.appendChild(createFeedbackContainer());

        chatEle.appendChild(chatElement);
    })    
    .catch((error) => {
        console.log(error);
        messageElement.classList.add("error");
        messageElement.textContent = "Oops! Something went wrong. Please try again.";
    }).finally(() => chatbox.scrollTo(0, chatbox.scrollHeight));
}

const handleChat = () => {
    userMessage = chatInput.value.trim(); // Get user entered message and remove extra whitespace
    if(!userMessage) return;
    
    // Clear the input textarea and set its height to default
    chatInput.value = "";
    chatInput.style.height = `${inputInitHeight}px`;

    // Append the user's message to the chatbox
    chatbox.appendChild(createChatLi(userMessage, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);
    
    setTimeout(() => {
        // Display "Thinking..." message while waiting for the response
        const incomingChatLi = createChatLi("Searching...", "incoming");
        chatbox.appendChild(incomingChatLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        generateResponse(incomingChatLi);
    }, 600);
}

chatInput.addEventListener("input", () => {
    // Adjust the height of the input textarea based on its content
    chatInput.style.height = `${inputInitHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
});

chatInput.addEventListener("keydown", (e) => {
    // If Enter key is pressed without Shift key and the window 
    // width is greater than 800px, handle the chat
    if(e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        handleChat();
    }
});

sendChatBtn.addEventListener("click", handleChat);
closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));

function showMore(element) {
    const messageDiv = element.parentElement.parentElement;
    messageDiv.querySelector('.short-response').style.display = 'none';
    messageDiv.querySelector('.full-response').style.display = 'inline';
}

function showLess(element) {
    const messageDiv = element.parentElement.parentElement;
    messageDiv.querySelector('.short-response').style.display = 'inline';
    messageDiv.querySelector('.full-response').style.display = 'none';
}

function GetUserName()
{
    var wshell = new ActiveXObject("WScript.Shell");
    alert(wshell.ExpandEnvironmentStrings("%USERNAME%"));
}

function createTabContentElement(content, wordLimit) {
    const contentElement = document.createElement("div");

    const { truncated, original, isTruncated } = truncateText(content, wordLimit);

    const textElement = document.createElement("span");
    textElement.innerHTML = truncated;
    contentElement.appendChild(textElement);

    if (isTruncated) {
        const showMoreLink = document.createElement("span");
        showMoreLink.className = "show-more-less";
        showMoreLink.innerText = " Show more";
        contentElement.appendChild(showMoreLink);

        const showLessLink = document.createElement("span");
        showLessLink.className = "show-more-less";
        showLessLink.innerText = " Show less";
        showLessLink.style.display = "none";
        contentElement.appendChild(showLessLink);

        showMoreLink.addEventListener("click", () => {
            textElement.innerHTML = original;
            showMoreLink.style.display = "none";
            showLessLink.style.display = "inline";
        });

        showLessLink.addEventListener("click", () => {
            textElement.innerHTML = truncated;
            showMoreLink.style.display = "inline";
            showLessLink.style.display = "none";
        });
    }

    return contentElement;
}

function createFeedbackContainer(){

    const feedbackContainer = document.createElement('div');
    feedbackContainer.classList.add('feedback-container');

    // Create thumbs up button
    const thumbsUpButton = document.createElement('span');
    thumbsUpButton.classList.add('feedback');
    thumbsUpButton.innerHTML = '<span class="material-icons">thumb_up</span>';
    thumbsUpButton.addEventListener('click', function() {
        thumbsUpButton.classList.toggle('selected');
        thumbsDownButton.classList.remove('selected');
    });

    // Create thumbs down button
    const thumbsDownButton = document.createElement('span');
    thumbsDownButton.classList.add('feedback');
    thumbsDownButton.innerHTML = '<span class="material-icons">thumb_down</span>';
    thumbsDownButton.addEventListener('click', function() {
        thumbsDownButton.classList.toggle('selected');
        thumbsUpButton.classList.remove('selected');
    });

    // Append buttons to feedback container
    feedbackContainer.appendChild(thumbsUpButton);
    feedbackContainer.appendChild(thumbsDownButton);

    return feedbackContainer;
}

function feedBackHandler(){
    document.querySelector('.feedback').addEventListener('click', function() {
        // Remove 'selected' class from all sibling elements
        this.parentElement.querySelectorAll('.feedback').forEach(sibling => {
            sibling.classList.remove('selected');
        });

        // Add 'selected' class to the clicked button
        this.classList.add('selected');
    });
}

function createSourceTabContentElement(content, wordLimit) {
    const contentElement = document.createElement("div");   
    let { truncated, original, isTruncated } = truncateText(content['page-content'], wordLimit);
    const textElement = document.createElement("span");
    truncated = `<p class="metadata"><span class="metadata-type">Page: </span>${content.metadata.page}</p>
        <p class="metadata"><span class="metadata-type">Document: </span><a href=${content.metadata.source}>${content.metadata.source}</a></p>
        <p class="metadata"><span class="metadata-type">Relevance Score: </span>${content.metadata.relevance_score}</p>
        <span class="metadata"><span class="metadata-type">Metadata: </span>${truncated}</span>`;

    original = `<p class="metadata"><span class="metadata-type">Page: </span>${content.metadata.page}</p>
        <p class="metadata"><span class="metadata-type">Document: </span><a href=${content.metadata.source}>${content.metadata.source}</a></p>
        <p class="metadata"><span class="metadata-type">Relevance Score: </span>${content.metadata.relevance_score}</p>
        <span class="metadata"><span class="metadata-type">Metadata: </span>${original}</span>`;
    textElement.innerHTML = truncated;
    contentElement.appendChild(textElement);

    if (isTruncated) {
        const showMoreLink = document.createElement("span");
        showMoreLink.className = "show-more-less";
        showMoreLink.innerText = " Show more";
        contentElement.appendChild(showMoreLink);

        const showLessLink = document.createElement("span");
        showLessLink.className = "show-more-less";
        showLessLink.innerText = " Show less";
        showLessLink.style.display = "none";
        contentElement.appendChild(showLessLink);

        showMoreLink.addEventListener("click", () => {
            textElement.innerHTML = original;
            showMoreLink.style.display = "none";
            showLessLink.style.display = "inline";
        });

        showLessLink.addEventListener("click", () => {
            textElement.innerHTML = truncated;
            showMoreLink.style.display = "inline";
            showLessLink.style.display = "none";
        });
    }

    return contentElement;
}


function truncateText(text, wordLimit) {
    const words = cleanText(text).split(" ");
    if (words.length <= wordLimit) {
        return { truncated: text, original: text, isTruncated: false };
    }
    const truncated = words.slice(0, wordLimit).join(" ") + "...";
    return { truncated: truncated, original: text, isTruncated: true };
}

function cleanText(text) {

    // Remove all non-alphanumeric characters
    let cleanedText = String(text).replace(/[^a-zA-Z0-9\s]/g, '');
    
    // Replace multiple spaces with a single space
    cleanedText = cleanedText.replace(/\s+/g, ' ');
    
    // Trim leading and trailing spaces
    cleanedText = cleanedText.trim();
    return cleanedText;
}


document.addEventListener("DOMContentLoaded", function() {
    const chatInput = document.querySelector('.chat-input')
    const micButton = document.querySelector('.mic');
    const sendButton = document.getElementById("send-btn");

    let recognition;

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
        recognition = new SpeechRecognition();
    } else {
        alert("Speech Recognition API is not supported in this browser.");
        return;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    micButton.addEventListener("click", () => {
        recognition.start();
        micButton.style.background = "#ff0000";
    });

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        chatInput.value = finalTranscript || interimTranscript;
    };

    sendButton.addEventListener("click", () => {
        recognition.stop();
        micButton.style.background = "#28a745";
        // Handle sending the message here
        console.log(chatInput.value); // Just logging the message to console for now
    });
});