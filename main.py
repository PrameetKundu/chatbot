from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import APIRouter, FastAPI
from fastapi import Request
from fastapi.responses import (
    HTMLResponse,
    JSONResponse
)

from pydantic import BaseModel

from service import DocumentQueryService


# class Request(BaseModel):
#     query: str

class QueryAPI:

    def __init__(self):
        self.query_Service = DocumentQueryService()

app = FastAPI()
queryAPI = QueryAPI()
app.mount(path="/static", app=StaticFiles(directory="static", html=True),name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    print(request)
    return templates.TemplateResponse(request=request, name="index.html")        

@app.post("/query", response_class=JSONResponse)
async def query(request: Request):
    requestJson = await request.json()
    response = queryAPI.query_Service.rag_chain.invoke(requestJson['query'])
    return JSONResponse(content={'response':response})
