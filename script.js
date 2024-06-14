// import axios from 'axios';

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
    let chatContent = className === "outgoing" ? `<p></p>` : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
    chatLi.innerHTML = chatContent;
    chatLi.querySelector("p").textContent = message;
    return chatLi; // return chat <li> element
}
const generateResponse1= async (chatElement) => {
    var settings = {
        "url": "http://127.0.0.1:8000/query/",
        "method": "POST",
        "mode":"no-cors",
        "timeout": 0,
        "headers": {
          "Content-Type": "application/json"
        },
        "data": JSON.stringify({
          "query": "how to do transactions"
        }),
      };
      
      $.ajax(settings).done(function (response) {
        console.log(response);
      });
  }

const generateResponse = async (chatElement) => {
    const API_URL = 'http://127.0.0.1:8000/query/';
    const messageElement = chatElement.querySelector("p");
    console.log("user entered");
    console.log(userMessage);

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
    // await fetch(API_URL, requestOptions)
    // .then(res => res.json())
    // .then(data => console.log(data))
    // .catch((error) => {
    //     console.log(error);
    //     messageElement.classList.add("error");
    //     messageElement.textContent = "Oops! Something went wrong. Please try again.";
    // }).finally(() => chatbox.scrollTo(0, chatbox.scrollHeight));
    console.log(requestOptions)
    const response = await (await fetch (API_URL, requestOptions))
    console.log(response)
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
        const incomingChatLi = createChatLi("Thinking...", "incoming");
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