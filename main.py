from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import (
    HTMLResponse,
)

from pydantic import BaseModel

from rag import DocumentQueryService

app = FastAPI()


class Request(BaseModel):
    query: str

@app.post("/query")
def returnResponse(request : Request):
    queryService = DocumentQueryService()
    response = queryService.rag_chain.invoke(request.query)
    return {"response" : response}
