const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatbox = document.querySelector(".chatbox");
const chatInput = document.querySelector(".chat-input textarea");
const sendChatBtn = document.querySelector(".chat-input span");
const versionSelector = document.querySelector(".select-version");
const scriptInput = document.getElementById("script-input");

let userMessage = null; // Variable to store user's message
const API_KEY = "PASTE-YOUR-API-KEY"; // Paste your API key here
const inputInitHeight = chatInput.scrollHeight;
let awaitingIncidentNumberforStatus = false;
let awaitingIncidentNumberforDetails = false;

const createChatLi = (message, className) => {
    // Create a chat <li> element with passed message and className
    const chatLi = document.createElement("li");
    chatLi.classList.add("chat", `${className}`);
    let chatContent = className === "outgoing" ? `<p>${message}</p>` : `<span class="material-symbols-outlined headset-mic">headset_mic</span><p>${message}</p>`;
    chatLi.innerHTML = chatContent;
    return chatLi; // return chat <li> element
}

const generateResponse = async (chatEle) => {
    const API_URL = '/incidentResolution/query';
    const messageElement = chatEle.querySelector("p");
    console.log("reached here");

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

    // Send POST request to API, get response and set the response as paragraph text
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

        // Add a button to start a new chat
        const newChatButtonDiv = document.createElement("div");
        newChatButtonDiv.classList.add("new-chat-container");
        newChatButtonDiv.innerHTML = `
            <li class="chat incoming">
            <span class="material-symbols-outlined headset-mic">headset_mic</span>
            <div>
            <button class="option-btn" onclick="showOptions()">Start New Chat</button>
            </div>
            </li>
        `;
        chatbox.appendChild(newChatButtonDiv);
        chatbox.scrollTo(0, chatbox.scrollHeight);
    })    
    .catch((error) => {
        console.log(error);
        messageElement.classList.add("error");
        messageElement.textContent = "Oops! Something went wrong. Please try again.";
    }).finally(() => chatbox.scrollTo(0, chatbox.scrollHeight));
}

// Append the user's selected option to the chatbox
const handleOption = (option) => {
    // Append the user's selected option to the chatbox
    chatbox.appendChild(createChatLi(option, "outgoing"));
    chatbox.scrollTo(0, chatbox.scrollHeight);

    if (option === 'get incident status') {
        awaitingIncidentNumberforStatus = true;
        chatbox.appendChild(createChatLi("Please enter the incident number:", "incoming"));
        chatbox.scrollTo(0, chatbox.scrollHeight);
    } else if (option === 'run automation script') {
        scriptInput.click();
        scriptInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const scriptContent = e.target.result;

                    chatbox.scrollTo(0, chatbox.scrollHeight);
                    setTimeout(() => {
                        const incomingChatLi = createChatLi("Script run in progress...", "incoming");
                        chatbox.appendChild(incomingChatLi);
                        chatbox.scrollTo(0, chatbox.scrollHeight);
                        runScript(scriptContent).then(() => {
                            chatbox.removeChild(incomingChatLi);
                        }).catch((error) => {
                            console.log(error);
                            chatbox.removeChild(incomingChatLi);
                            chatbox.appendChild(createChatLi("Failed to run the script. Please try again.", "incoming"));
                        });
                    }, 600);
                };
                reader.readAsText(file);
            }
        };
    } else if (option === 'chat with me for incident resolution') {
        handleIncidentResolution();
    } else if (option === 'yes') {
        // Handle the case where the user wants help to resolve the incident
        chatbox.appendChild(createChatLi("Great! Let's proceed with the resolution.", "incoming"));
        chatbox.scrollTo(0, chatbox.scrollHeight);
        // Add further steps for resolution here
    } else if (option === 'no') {
        showOptions();
    } else {
        userMessage = option;
        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);
        
        setTimeout(() => {
            const incomingChatLi = createChatLi("Processing...", "incoming");
            chatbox.appendChild(incomingChatLi);
            chatbox.scrollTo(0, chatbox.scrollHeight);
            generateResponse(incomingChatLi);
        }, 600);
    }
}

const runScript = async (scriptContent) => {
    const API_URL = '/run-script';
    const requestOptions = {
        method: "POST",
        headers: {                        
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ script: scriptContent })
    };

    await fetch(API_URL, requestOptions)
    .then(res => res)
    .then(async res => {
        const data = await res.json();
        console.log("data" + data.message)
        if (data.message) {
            console.log(data.message)
            chatbox.appendChild(createChatLi(data.message, "incoming"));
        } else if (data.error) {
            chatbox.appendChild(createChatLi(data.error, "incoming"));
        }
        showOptions();
    })  
    .catch((error) => {
        console.log(error);
        chatbox.appendChild(createChatLi("Failed to run the script. Please try again.", "incoming"));
        showOptions();
    })
    .finally(() => chatbox.scrollTo(0, chatbox.scrollHeight));
    console.log("reached here 100")
};

const handleIncidentResolution = () => {
    awaitingIncidentNumberforDetails = true;
    chatbox.appendChild(createChatLi("Please enter the incident number for resolution:", "incoming"));
    chatbox.scrollTo(0, chatbox.scrollHeight);
};

const fetchIncidentDetails = async (incidentNumber, chatEle) => {
    const API_URL = `/incident/${incidentNumber}/details`;
    const requestOptions = {
        method: "GET",
        headers: {                        
            "Content-Type": "application/json"
        }
    };
    const messageElement = chatEle.querySelector("p");

    // Send GET request to API, get response and set the response as paragraph text
    fetch(API_URL, requestOptions)
    .then(res => {
        if (!res.ok) {
            throw new Error('Network response was not ok');
        }
        return res.json();
        
    })
    .then(data => {
        console.log("data: " + data.result);
        const summary = `Incident Number: ${data.result[0].number}\nState: ${data.result[0].state}\nPriority: ${data.result[0].priority}\nShort Description: ${data.result[0].short_description}\nDescription: ${data.result[0].description}\n`;
        
        chatEle.innerHTML = `<span class="material-symbols-outlined headset-mic">headset_mic</span><p>${summary}Do you want me to help you resolve this incident?</p>`;
        showYesOrNoButton();
    })    
    .catch((error) => {
        console.log(error);
        messageElement.classList.add("error");
        messageElement.textContent = "Oops! Something went wrong. Please try again.";
    }).finally(() => chatbox.scrollTo(0, chatbox.scrollHeight));
};

const handleChat = () => {
    userMessage = chatInput.value.trim(); // Get user entered message and remove extra whitespace
    if(!userMessage) return;
    
    // Clear the input textarea and set its height to default
    chatInput.value = "";
    chatInput.style.height = `${inputInitHeight}px`;

    if(awaitingIncidentNumberforStatus){
        awaitingIncidentNumberforStatus = false;
        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);

        setTimeout(() => {
            const incomingChatLi = createChatLi("Fetching incident status...", "incoming");
            chatbox.appendChild(incomingChatLi);
            chatbox.scrollTo(0, chatbox.scrollHeight);
            fetchIncidentStatus(userMessage, incomingChatLi);
        }, 600);
    }
    else if (awaitingIncidentNumberforDetails) {
        awaitingIncidentNumberforDetails = false;
        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);
        
        setTimeout(() => {
            const incomingChatLi = createChatLi("Fetching incident details...", "incoming");
            chatbox.appendChild(incomingChatLi);
            chatbox.scrollTo(0, chatbox.scrollHeight);
            fetchIncidentDetails(userMessage, incomingChatLi);
        }, 600);
    } else {
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
}

const fetchIncidentStatus = async (incidentNumber, chatEle) => {
    const API_URL = `/incident/${incidentNumber}`;
    const requestOptions = {
        method: "GET",
        headers: {                        
            "Content-Type": "application/json"
        }
    }
    const messageElement = chatEle.querySelector("p");

    // Send GET request to API, get response and set the response as paragraph text
    fetch(API_URL, requestOptions)
    .then(res => {
        if (!res.ok) {
            throw new Error('Network response was not ok');
        }
        return res.json();
    })
    .then(data => {
        const statusMap = {
            1: "New",
            2: "In Progress",
            3: "On hold",
            4: "Resolved",
            5: "Closed",
            6: "Cancelled"
        };
        const status = statusMap[data.result[0].incident_state] || "Unknown";
        chatEle.innerHTML = `<span class="material-symbols-outlined headset-mic">headset_mic</span><p>Incident Status: ${status}</p>`;
        showOptions();
    })    
    .catch((error) => {
        console.log(error);
        messageElement.classList.add("error");
        messageElement.textContent = "Oops! Something went wrong. Please try again.";
        showOptions();
    }).finally(() => chatbox.scrollTo(0, chatbox.scrollHeight));
}

const showOptions = () => {
    setTimeout(() => {
        const optionsDiv = document.createElement("div");
        optionsDiv.classList.add("options-container");
        optionsDiv.innerHTML = `
            <li class="chat incoming">
            <span class="material-symbols-outlined headset-mic">headset_mic</span>
            <div>
            <p>Thank you for contacting platform support virtual assistant, Please choose an option.</p>
            <button class="option-btn" onclick="handleOption('get incident status')">Get Incident Status</button>
            <button class="option-btn" onclick="handleOption('run automation script')">Run Automation Script</button>
            <button class="option-btn" onclick="handleOption('chat with me for incident resolution')">Chat with me for incident resolution</button>
            <button class="option-btn" onclick="handleOption('summarize rca')">Summarize RCA</button>
            <button class="option-btn" onclick="handleOption('launch health check')">Launch Health Check</button>
            <button class="option-btn" onclick="handleOption('pull related incidents')">Pull Related Incidents</button>
            </div>
            </li>
        `;
        chatbox.appendChild(optionsDiv);
        chatbox.scrollTo(0, chatbox.scrollHeight);
    }, 1000);
}

const showYesOrNoButton = () => {
    setTimeout(() => {
        const optionsDiv = document.createElement("div");
        optionsDiv.classList.add("yes-or-no-container");
        optionsDiv.innerHTML = `
            <li class="chat incoming">
            <span class="material-symbols-outlined headset-mic">headset_mic</span>
            <div>
            <button class="option-btn" onclick="handleOption('yes')">Yes</button>
            <button class="option-btn" onclick="handleOption('no')">No</button>
            </div>
            </li>
        `;
        chatbox.appendChild(optionsDiv);
        chatbox.scrollTo(0, chatbox.scrollHeight);
    }, 1000);
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


document.addEventListener("DOMContentLoaded", () => {
    const micButton = document.querySelector('.mic');
    const textArea = document.querySelector('.text-area');
    const sendButton = document.getElementById('send-btn');

    let recognition;
    let isRecording = false;

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
        recognition = new SpeechRecognition();
    } else {
        alert("Sorry, your browser does not support speech recognition.");
        return;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        textArea.value = finalTranscript + interimTranscript;
    };

    micButton.addEventListener('click', () => {
        if (isRecording) {
            recognition.stop();
            micButton.classList.remove("recording");
            isRecording = false;
            console.log(textArea.value);
        } else {
            recognition.start();
            micButton.classList.add("recording");
            isRecording = true;
        }
    });
});

const websocket = new WebSocket("ws://localhost:8000/ws");

websocket.onmessage = function(event) {
    const message = JSON.parse(event.data);
    if (message.type === "new") {
        addIncidentToTable(message.incident);
    } else if (message.type === "resolved") {
        removeIncidentFromTable(message.incident.id);
    }
};

function addIncidentToTable(incident) {
    const table = document.getElementById("incident-table");
    const row = table.insertRow();
    row.id = `incident-${incident.id}`;
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);
    cell1.innerHTML = incident.id;
    cell2.innerHTML = incident.status;
}

function removeIncidentFromTable(incidentId) {
    const row = document.getElementById(`incident-${incidentId}`);
    if (row) {
        row.remove();
    }
}