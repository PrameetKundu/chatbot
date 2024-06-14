# LangChain-RAG-System-with-Google-Gemini


Add the api key in keys/.gemini_api_key.txt

run the chainlit implementation using "python -m chainlit run chatbot.py"

1. Back End Server Set Up
- Install uvicorn, FastAPI
- create fastAPI uvicorn server using "uvicorn main:app --reload"

API endpoint: http://127.0.0.1:8000/query [POST]
body json: {"query": **enter your query here**}

2. Front End Server Set Up
- Install Node.js
- Install http-server globally using command 'npm install -g http-server'
- Add npm and http-server locations to env variable PATH(both user and system variable) - C:\Users\username\Roamng\npm and C:\Users\username\Roamng\npm\node_modules\http-server (Restart the IDE after this, to make changes to effect)
- open terminal and run 'http-server. The webpage will open in localhost:8080

3. Commands for dependencies
- CORS middleware - 
