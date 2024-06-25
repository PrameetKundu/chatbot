from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain.prompts.chat import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
)
from langchain.retrievers.contextual_compression import ContextualCompressionRetriever
from langchain_cohere import CohereRerank
from langchain.chains import RetrievalQA
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_google_vertexai import VertexAI

import os
import sys

class DocumentQueryServicev3:
        
    def initialise_genai_model(self):
        
        #  Setup chat model
        os.environ["COHERE_API_KEY"] = 'ub2MuhCm0yj9p4RvTXFrcnGqsLBT4O1zuHNXxM1G'
        PROJECT_ID = "green-calling-195118"  # @param {type:"string"}
        LOCATION = "us-central1-c"  # @param {type:"string"}
        self.chat_model = VertexAI(model_name="gemini-1.5-flash",  max_output_tokens=1024)
        self.embedding_model = VertexAIEmbeddings(model_name="textembedding-gecko@003")
        self.db_name="./chroma_db_v3_"

    # Load the doc
    def load_documents(self):
        self.loader = PyPDFLoader("https://www.wellsfargo.com/fetch-pdf?formNumber=CNS2013&subProductCode=ANY")
        self.pages = self.loader.load_and_split()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        self.chunks = text_splitter.split_documents(self.pages)
        print(len(self.chunks))

    
    def create_embeddings(self):        
        db = Chroma.from_documents(self.chunks[0:25], self.embedding_model, persist_directory=self.db_name)        
        db.persist()             


    def infoRetriever(self):    
        db = Chroma(persist_directory=self.db_name, embedding_function=self.embedding_model)
        self.retriever = ContextualCompressionRetriever(
            base_compressor= CohereRerank(), 
            base_retriever=db.as_retriever(search_kwargs={"k": 3}),
            searchType = 'similarity'
        )

    def setup_chat_template(self):
        self.chat_template = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are a Helpful AI Bot.
                        Given a document and question from user,
                        you should answer based on the given  document"""),
            HumanMessagePromptTemplate.from_template("""Answer the question based on the given document
            Context: {context}
            Question: {question}
            Answer: """)
        ])
        self.prompt ="""Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. Keep you answers verbose, but less than 6 lines. 
            {context}
            Question: {question}
            Helpful Answer:"""
        self.QA_CHAIN_PROMPT = PromptTemplate.from_template(self.prompt)        

    def setup_rag_chain(self):
        self.rag_chain = RetrievalQA.from_chain_type(
            llm=self.chat_model,
            retriever=self.retriever,
            chain_type_kwargs={"prompt": self.QA_CHAIN_PROMPT},
            return_source_documents = True
        )
    
    
    def __init__(self) -> None:
        self.initialise_genai_model()     
        #self.load_documents()
        #self.create_embeddings()   
        self.infoRetriever()
        self.setup_chat_template()
        self.setup_rag_chain()    