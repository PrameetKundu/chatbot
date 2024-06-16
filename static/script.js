const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector(".chat-input span");

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
    const API_URL = '/v1/query';
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
    const sources = [
        "Source 1: This is the first source This is the first source This is the first source This is the first source This is the first source .",
        "Source 2: This is the second source.",
        "Source 3: This is the third source.",
        "Source 4: This is the fourth source."
    ];
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
        sources.forEach((source, index) => {
            const tab = document.createElement("div");
            tab.className = "tab";
            tab.innerText = `Source ${index + 1}`;
            tabContainer.appendChild(tab);
            tabs.push(tab);

            const content = document.createElement("div");
            content.className = "tab-content";
            content.appendChild(createTabContentElement(source, wordLimit));
            chatElement.appendChild(content);
            tabContents.push(content);
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

        chatElement.insertBefore(tabContainer, chatElement.firstChild);
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

function truncateText(text, wordLimit) {
    const words = text.split(" ");
    if (words.length <= wordLimit) {
        return { truncated: text, original: text, isTruncated: false };
    }
    const truncated = words.slice(0, wordLimit).join(" ");
    return { truncated: truncated, original: text, isTruncated: true };
}