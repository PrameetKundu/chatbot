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
    let chatContent = className === "outgoing" ? `<p>${message}</p>` : `<span class="material-symbols-outlined">headset_mic</span><p>${message}</p>`;
    chatLi.innerHTML = chatContent;
    return chatLi; // return chat <li> element
}

const generateResponse = async (chatElement) => {
    const API_URL = '/v2/query';
    const messageElement = chatElement.querySelector("p");

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
        let response = data.response;
        const shortResponse = response.substring(0, 100);
        console.log(data.sources)
        const fullResponse = response;
        chatElement.innerHTML = `
            <span class="material-symbols-outlined">headset_mic</span>
                <p class="short-response">${shortResponse}...<a class="show-more" onclick="showMore(this)">Show more</a></p>
                <p class="full-response" style="display: none;">${fullResponse}<a class="show-less" onclick="showLess(this)">Show less</a></p>         
        `;
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