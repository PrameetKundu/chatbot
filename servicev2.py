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

# from langchain_huggingface import HuggingFaceEmbeddings
import os

class DocumentQueryServicev2:
        
    def initialise_genai_model(self):
        
        # Read the API key
        f = open("keys/.gemini_api_key.txt")
        key = f.read()
        os.environ["GOOGLE_API_KEY"] = key
        #  Setup chat model
        self.chat_model = ChatGoogleGenerativeAI(model="gemini-1.5-flash")
        os.environ["COHERE_API_KEY"] = 'ub2MuhCm0yj9p4RvTXFrcnGqsLBT4O1zuHNXxM1G'

    # Load the doc
    def load_documents(self):
        self.loader = PyPDFLoader("https://www.wellsfargo.com/fetch-pdf?formNumber=CNS2013&subProductCode=ANY")
        self.pages = self.loader.load_and_split()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=400)
        self.chunks = text_splitter.split_documents(self.pages)
        print(len(self.chunks))

    
    def create_embeddings(self):
        self.embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        db = Chroma.from_documents(self.chunks, self.embedding_model, persist_directory="./chroma_db_v2_")        
        db.persist()             

    def infoRetriever(self):    
        self.embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        db = Chroma(persist_directory="./chroma_db_v2_", embedding_function=self.embedding_model)
        self.retriever = ContextualCompressionRetriever(
            base_compressor= CohereRerank(), 
            base_retriever=db.as_retriever(search_kwargs={"k": 3}),
            searchType = 'mmr'
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
        self.prompt ="""Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. Keep you answers verbose, but less than 6 lines. Always say "Please check out the below links for more information on your query" at the end of the answer. 
            {context}
            Question: {question}
            Helpful Answer:"""
        self.QA_CHAIN_PROMPT = PromptTemplate.from_template(self.prompt)
        # self.output_parser = StrOutputParser()

    def setup_rag_chain(self):
        self.rag_chain = RetrievalQA.from_chain_type(
            llm=self.chat_model,
            retriever=self.retriever,
            # retriever = db.as_retriever(),
            # chain_type_kwargs={"prompt": self.chat_template},
            chain_type_kwargs={"prompt": self.QA_CHAIN_PROMPT},
            
            # chain_type="map_reduce",
            return_source_documents = True
    
)
    
    
    def __init__(self) -> None:
        self.initialise_genai_model()
        #self.load_documents()
        #self.create_embeddings()
        self.infoRetriever()
        self.setup_chat_template()
        self.setup_rag_chain()
        
    
    
    
    
    
    
    
    
    
    
    
    
    
    
# Streamlit UI
# with st.sidebar:
#     st.title(":blue[A Retrieval Augmented System on the 'Leave No Context Behind' Paper]")
# st.title(":blue[💬Document Chatbot]")
# query = st.text_area("Enter your query:", placeholder="Enter your query here...", height=100)

# if st.button("Submit Your Query"):
#     if query:
#         response = rag_chain.invoke(query)
#         st.write(response)
#     else:
#         st.warning("Please enter a question.")



# import streamlit as st
# from langchain_community.chat_message_histories import ChatMessageHistory
# history = ChatMessageHistory()

# chain_with_message_history = RunnableWithMessageHistory(
#     rag_chain,
#     lambda session_id: history,
#     input_messages_key="input",
#     history_messages_key="chat_history",
# )


# st.title("chatbot")

# if "messages" not in st.session_state:
#     st.session_state.messages = []


# for message in st.session_state.messages:
#     with st.chat_message(message["role"]):
#         st.markdown(message["content"])



# if prompt := st.chat_input("Hi, please proceed with your questions"):
#     with st.chat_message("user"):
#         st.markdown(prompt)
    
#     st.session_state.messages.append({"role": "user", "content" : prompt})
#     history.add_user_message(prompt)
    
    
#     response = rag_chain.invoke( {"messages" : history.messages})
    
#     with st.chat_message("assistant"):
#         st.markdown(response+"")
        
#     st.session_state.messages.append({"role" : "assistant", "content" : response})
#     history.add_ai_message(response)
   
    