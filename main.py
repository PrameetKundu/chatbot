from typing import List
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import APIRouter, FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import (
    HTMLResponse,
    JSONResponse
)
import os, io
import time
from time import perf_counter
import json
import jsons
from service import DocumentQueryService
from servicev2 import DocumentQueryServicev2
import requests
from requests.auth import HTTPBasicAuth
from subprocess import Popen, PIPE


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

