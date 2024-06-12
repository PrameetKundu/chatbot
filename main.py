from fastapi import APIRouter, FastAPI
from fastapi import Request
from fastapi.responses import (
    HTMLResponse,
)

from pydantic import BaseModel

from service import DocumentQueryService


class Request(BaseModel):
    query: str

class QueryAPI:

    def __init__(self):
        self.query_Service = DocumentQueryService()
        self.router = APIRouter()
        self.router.add_api_route("/query", self.get_response, methods=["POST"])

    def get_response(self, request : Request):
        response = self.query_Service.rag_chain.invoke(request.query)
        return HTMLResponse(response)
        
        


app = FastAPI()
queryAPI = QueryAPI()
app.include_router(queryAPI.router)