from typing import List
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import APIRouter, FastAPI
from fastapi import Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import (
    HTMLResponse,
    JSONResponse
)
import os, io
import time
from time import perf_counter
import json
from service import DocumentQueryService
from servicev2 import DocumentQueryServicev2
import requests
from requests.auth import HTTPBasicAuth
from subprocess import Popen, PIPE
import asyncio
from crewai import Agent, Task, Crew
from apscheduler.schedulers.background import BackgroundScheduler
# Generate a unique session ID on each app restart
import uuid
SESSION_ID = str(uuid.uuid4())

# class Request(BaseModel):
#     query: str

origins = [
    "http://localhost",
    "http://localhost:8080",
    "http://127.0.0.1:8080"
]

class QueryAPI:

    def __init__(self):
        self.query_Service = DocumentQueryService()
        self.query_Service_v2 = DocumentQueryServicev2()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*', 'http://127.0.0.1:8080'],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

queryAPI = QueryAPI()
app.mount(path="/static", app=StaticFiles(directory="static", html=True),name="static")
templates = Jinja2Templates(directory="templates")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"Message text was: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Function to notify clients about incident updates
async def notify_incident_update(update_type: str, incident: dict):
    message = {
        "type": update_type,
        "incident": incident
    }
    await manager.broadcast(json.dumps(message))

@app.get("/session_id")
async def get_session_id():
    return {"session_id": SESSION_ID}    

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    
    print(request)
    return templates.TemplateResponse(request=request, name="index.html")        

@app.post("/v1/query", response_class=JSONResponse)
async def query(request: Request):
    
    logger = {}
    logger["endpoint"] = "/v1/query"
    logger["starting time"] = time.ctime()
    time1 = time.perf_counter()
    requestJson = await request.json()
    print(requestJson);
    response = queryAPI.query_Service.rag_chain.invoke(requestJson['query'])
    logger["time elapsed"] = time.perf_counter() - time1
    logger["response"] = response
    try:
        return JSONResponse(content={'response':response})
    finally:
        write_to_log(logger)
    
@app.post("/v2/query", response_class=JSONResponse)
async def query(request: Request):
    print("recahed v2");
    logger = {}
    logger["endpoint"] = "/v2/query"
    logger["starting time"] = time.ctime()
    time1 = time.perf_counter()
    requestJson = await request.json()
    response = queryAPI.query_Service_v2.rag_chain.invoke({'query': requestJson['query']})
    logger["time elapsed"] = time.perf_counter() - time1
    # print(response)
    logger["response"] = {'response': response['result'], 'sources': [{'page-content' : i.page_content, 'metadata':i.metadata} for i in response['source_documents']]}
    try:
        return JSONResponse(content={'response': response['result'], 'sources': [{'page-content' : i.page_content, 'metadata':i.metadata} for i in response['source_documents']]})
    finally:
        write_to_log(logger)

@app.post("/incidentResolution/query", response_class=JSONResponse)
async def query(request: Request):
    logger = {}
    logger["endpoint"] = "/incidentResolution/query"
    logger["starting time"] = time.ctime()
    time1 = time.perf_counter()
    requestJson = await request.json()
    print(requestJson);
    response = queryAPI.query_Service.rag_chain.invoke(requestJson['query']) # make new RAG chain
    logger["time elapsed"] = time.perf_counter() - time1
    logger["response"] = response
    try:
        return JSONResponse(content={'response':response})
    finally:
        write_to_log(logger)

@app.get("/incident/{incident_number}", response_class=JSONResponse)
async def get_incident(incident_number: str):
    url = f"https://dev305679.service-now.com/api/now/table/incident?sysparm_query=number={incident_number}"
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    auth = HTTPBasicAuth("admin", "2jzx/UCkO2I@")  # Use HTTPBasicAuth for authentication
    response = requests.get(url, headers=headers, auth=auth)
    return response.json()

@app.get("/incident/{incident_number}/details", response_class=JSONResponse)
async def get_incident_details(incident_number: str):
    url = f"https://dev305679.service-now.com/api/now/table/incident?sysparm_query=number={incident_number}"
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    auth = HTTPBasicAuth("admin", "2jzx/UCkO2I@")  # Use HTTPBasicAuth for authentication
    response = requests.get(url, headers=headers, auth=auth)
    return response.json()

@app.post("/run-script", response_class=JSONResponse)
async def run_script(request: Request):
    
    try:
        requestJson = await request.json()
        print("reached server 1")
        script_content = requestJson.get('script', '')
        print("reached server" + script_content)
        # Save the script content to a temporary file
        temp_file_path = os.path.abspath('temp_script.bat')
        with open(temp_file_path, 'w') as temp_file:
            temp_file.write(script_content)

        # Execute the script
        process = Popen(['cmd', '/c', temp_file_path], stdout=PIPE, stderr=PIPE)
        print("reached server 2")
        stdout, stderr = process.communicate()  # Set timeout to 30 seconds
        print(stdout.decode())
        print(stderr.decode())

        # Clean up the temporary file
        os.remove(temp_file_path)

        if process.returncode == 0:
            # print(stdout.decode())
            return JSONResponse(content={'message': 'Script ran successfully.'})
        else:
            # print(stderr.decode())
            return JSONResponse(content={'error': 'Failed to run the script.'}, status_code=500)
    except Exception as e:
        return JSONResponse(content={'error': str(e)}, status_code=500)

@app.post("/incident/{incident_id}", response_class=JSONResponse)
async def create_incident(request: Request, incident_id: str):
    # ...existing code to create incident...
    incident = {"id": incident_id, "status": "new"}  # Example incident data
    await notify_incident_update("new", incident)
    return JSONResponse(content=incident)

@app.put("/incident/{incident_id}", response_class=JSONResponse)
async def resolve_incident(incident_id: str):
    # ...existing code to resolve incident...
    incident = {"id": incident_id, "status": "resolved"}  # Example incident data
    await notify_incident_update("resolved", incident)
    return JSONResponse(content=incident)

def write_to_log(data_dict):
    fname = "log.json"
    if os.path.isfile(fname):
        # File exists
        with open(fname, 'a+') as outfile:
            # outfile.seek(-1, os.SEEK_END)
            data = list(outfile)
            data.append(data_dict)
            json.dump(data, outfile)
    else: 
        # Create file
        with open(fname, 'w') as outfile:
            array = []
            array.append(data_dict)
            json.dump(array, outfile)

# Store existing incidents to prevent duplicates
existing_incidents = set()

# Function to fetch incidents from ServiceNow
def fetch_new_incidents():
    url = f"https://dev305679.service-now.com/api/now/table/incident?sysparm_query=state=1^ORstate=2^ORstate=6"
    headers = {"Accept": "application/json"}
    auth = HTTPBasicAuth("admin", "2jzx/UCkO2I@")  

    response = requests.get(url, headers=headers, auth=auth)

    if response.status_code == 200:
        incidents = response.json().get("result", [])
        new_incidents = []

        print("here...")
        print(incidents)
                
        for incident in incidents:
            incident_id = incident.get("number")
            status = incident.get("state", "Unknown")
            
            print(f"Here 1: {incident_id} - Status: {status}")
            if incident_id not in existing_incidents or status == '6' or status == 6:
                existing_incidents.add(incident_id)
                print(f"New Incident: {incident_id} - Status: {status}")
                new_incidents.append({"id": incident_id, "status": status})

        # Send new incidents via WebSockets if found
        if new_incidents.__len__()>0:
            asyncio.run(manager.broadcast(json.dumps(new_incidents)))

# Define CrewAI Agent
incident_fetch_agent = Agent(
    role="Incident Fetcher",
    goal="Fetch newly created incidents from ServiceNow and push them to the UI in real time.",
    backstory="A real-time ServiceNow monitoring agent ensuring the UI is always updated.",
    verbose=True
)

# Define the task for the agent
fetch_incidents_task = Task(
    description="Fetch new incidents from ServiceNow and send them via WebSockets to update the UI in real time.",
    agent=incident_fetch_agent,
    function=fetch_new_incidents,
    expected_output="A list of new incidents fetched from ServiceNow."
)

# Create the Crew
incident_crew = Crew(
    agents=[incident_fetch_agent],
    tasks=[fetch_incidents_task]
)

# Schedule the agent to run every 1 minute
scheduler = BackgroundScheduler()
scheduler.add_job(fetch_new_incidents, "interval", minutes=1)
scheduler.start()


