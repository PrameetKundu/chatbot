from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import APIRouter, FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import (
    HTMLResponse,
    JSONResponse
)

from pydantic import BaseModel

from service import DocumentQueryService
from servicev2 import DocumentQueryServicev2


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
    requestJson = await request.json()
    response = queryAPI.query_Service.rag_chain.invoke(requestJson['query'])
    return JSONResponse(content={'response':response})
    
@app.post("/v2/query", response_class=JSONResponse)
async def query(request: Request):
    requestJson = await request.json()
    response = queryAPI.query_Service_v2.rag_chain.invoke({'query': requestJson['query']})
    print(response)
    return JSONResponse(content={'response': response['result'], 'sources': [i.metadata for i in response['source_documents']]})