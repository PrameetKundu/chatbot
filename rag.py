import streamlit as st
import langchain_core
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
import os

# Read the API key
f = open("keys/.gemini_api_key.txt")
key = f.read()

import os 
os.environ["GOOGLE_API_KEY"] = key
#  Setup chat model
chat_model = ChatGoogleGenerativeAI(model="gemini-1.5-flash")

# Load the doc
loader = PyPDFLoader("SPX.pdf")
pages = loader.load_and_split()

# Split the document into chunks
text_splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=100)
chunks = text_splitter.split_documents(pages)

# Creating Chunks Embedding
embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

# Embed each chunk and load it into the vector store
db = Chroma.from_documents(chunks, embedding_model, persist_directory="./chroma_db_")

# Persist the database on drive
db.persist()

# Setting a Connection with the ChromaDB
db_connection = Chroma(persist_directory="./chroma_db_", embedding_function=embedding_model)

# Converting CHROMA db_connection to Retriever Object
retriever = db_connection.as_retriever(search_kwargs={"k": 5})

# Setup chat template
chat_template = ChatPromptTemplate.from_messages([
    # System Message Prompt Template
    SystemMessage(content="""You are a Helpful AI Bot.
                  Given a context and question from user,
                  you should answer based on the given context."""),
    # Human Message Prompt Template
    HumanMessagePromptTemplate.from_template("""Answer the question based on the given context.
    Context: {context}
    Question: {question}
    Answer: """)
])

# set up output parser 
output_parser = StrOutputParser()

# rag chain
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | chat_template
    | chat_model
    | output_parser
)
# Streamlit UI
with st.sidebar:
    st.title(":blue[A Retrieval Augmented System on the 'Leave No Context Behind' Paper]")
st.title(":blue[💬Document Chatbot]")
query = st.text_area("Enter your query:", placeholder="Enter your query here...", height=100)

if st.button("Submit Your Query"):
    if query:
        response = rag_chain.invoke(query)
        st.write(response)
    else:
        st.warning("Please enter a question.")