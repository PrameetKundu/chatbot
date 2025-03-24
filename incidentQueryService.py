from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain.prompts.chat import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
)
# from langchain_huggingface import HuggingFaceEmbeddings
import os
import requests
from fastapi import HTTPException
from requests.auth import HTTPBasicAuth
class IncidentQueryService:
        
    def initialise_genai_model(self):
        
        # Read the API key
        f = open("keys/.gemini_api_key.txt")
        key = f.read()
        os.environ["GOOGLE_API_KEY"] = key
        #  Setup chat model
        self.chat_model = ChatGoogleGenerativeAI(model="gemini-1.5-flash")

    # Load the documents from ServiceNow API
    def load_documents(self):
        # Call the API from main.py
        response = self.get_articles("WellsFargo")

        # Check for errors in the response
        if "error" in response:
            raise Exception(f"Error: {response['error']}")

        # Extract the articles from the response
        articles = [Document(page_content=entry) for entry in response["filtered_content"]]

        # Split the articles into chunks
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=100)
        self.chunks = text_splitter.split_documents(articles)
        print(len(self.chunks))

    
    def create_embeddings(self):
        self.embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        db = Chroma.from_documents(self.chunks[0:5], self.embedding_model, persist_directory="./chroma_db_kb articles_")        
        db.persist()

    def infoRetriever(self):    
        self.embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        db_connection = Chroma(persist_directory="./chroma_db_kb articles_", embedding_function=self.embedding_model)
        self.retriever = db_connection.as_retriever(search_kwargs={"k": 5})

    def setup_chat_template(self):
        self.chat_template = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are a Helpful AI Bot.
                        Given a document and question from user,
                        you should answer based on the given  document.
                        """),
            HumanMessagePromptTemplate.from_template("""Answer the question based on the given document
            Context: {context}
            Question: {question}
            Answer: """)
        ])
        self.output_parser = StrOutputParser()

    def setup_rag_chain(self):
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)
        self.rag_chain = (
            {"context": self.retriever | format_docs, "question": RunnablePassthrough()}
            | self.chat_template
            | self.chat_model
            | self.output_parser
        )

    def get_articles(self, knowledge_base_name: str):
        try:
            USERNAME = "admin"
            INSTANCE = "https://dev305679.service-now.com/api/now/table"
            PASSWORD = "2jzx/UCkO2I@"
            # Step 1: Get the sys_id of the Knowledge Base
            kb_url = f"{INSTANCE}/kb_knowledge_base"
            kb_response = requests.get(
                kb_url,
                auth=HTTPBasicAuth(USERNAME, PASSWORD),
                params={"sysparm_query": f"name={knowledge_base_name}"},
                headers={"Accept": "application/json"}
            )

            if kb_response.status_code != 200:
                raise HTTPException(
                    status_code=kb_response.status_code,
                    detail="Failed to fetch knowledge base details."
                )

            kb_results = kb_response.json().get("result", [])
            if not kb_results:
                raise HTTPException(status_code=404, detail="Knowledge base not found.")
            
            kb_sys_id = "d21d62c8936ca21067f5f15a7bba1072"
        
            # Step 2: Get article numbers from kb_knowledge table
            articles_url = f"{INSTANCE}/kb_knowledge"
            articles_response = requests.get(
                articles_url,
                auth=HTTPBasicAuth(USERNAME, PASSWORD),
                params={
                    "sysparm_query": f"kb_knowledge_base={kb_sys_id}",
                    "sysparm_fields": "number",
                    "sysparm_limit": 10000
                },
                headers={"Accept": "application/json"}
            )

            if articles_response.status_code != 200:
                raise HTTPException(
                    status_code=articles_response.status_code,
                    detail="Failed to fetch article numbers."
                )

            articles = articles_response.json().get("result", [])
            article_numbers = [article["number"] for article in articles]
            print("Article Numbers:", article_numbers)

            # Step 3: Get all articles from sn_km_mr_st_kb_knowledge table
            full_articles_url = f"{INSTANCE}/sn_km_mr_st_kb_knowledge"
            full_articles_response = requests.get(
                full_articles_url,
                auth=HTTPBasicAuth(USERNAME, PASSWORD),
                params={"sysparm_limit": 10000},
                headers={"Accept": "application/json"}
            )

            if full_articles_response.status_code != 200:
                raise HTTPException(
                    status_code=full_articles_response.status_code,
                    detail="Failed to fetch articles from sn_km_mr_st_kb_knowledge."
                )

            all_articles = full_articles_response.json().get("result", [])
            
            # Filter articles by article numbers
            filtered_articles = [
                article for article in all_articles if article.get("number") in article_numbers
            ]
            filtered_content = [article.get("content") for article in filtered_articles]

            print("Filtered Articles:", filtered_content);
            return {"filtered_content": filtered_content}

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    
    
    def __init__(self) -> None:
        self.initialise_genai_model()
        # self.load_documents()
        # self.create_embeddings()
        self.infoRetriever()
        self.setup_chat_template()
        self.setup_rag_chain()
