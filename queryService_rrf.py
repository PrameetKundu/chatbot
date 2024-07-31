import os

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.load import dumps, loads

class DocumentQueryServicev4:
    def setup(self):
        f = open("keys/.gemini_api_key.txt")
        key = f.read()
        os.environ["GOOGLE_API_KEY"] = key
        #  Setup chat model
        self.chat_model = ChatGoogleGenerativeAI(model="gemini-1.5-flash")
        self.embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        db = Chroma(persist_directory="./chroma_db_combined", embedding_function=self.embedding_model)
        self.retriever = db.as_retriever(search_kwargs={"k": 3})
        
        
    def rrf_util(self, results):
        fused_Scores = {}
        k = 60
        for docs in results:
            for rank, doc in enumerate(docs):
                doc_Str = dumps(doc)
                if doc_Str not in fused_Scores:
                    fused_Scores[doc_Str] = 0
                fused_Scores[doc_Str] += 1/(rank + k)
                                
        reranked_results = [
            {"documents" :loads(doc), "reranked_score": score}
            for doc, score in sorted(fused_Scores.items(), key=lambda x: x[1], reverse = True)
        ]
        return reranked_results
    
    def generate_results(self, query: str):
        template = """You are a helpful assistant that generates multiple search queries. Generate multiple search queries related to: {question} \n
            Output (4 queries):"""

        prompt_rag_fusion = ChatPromptTemplate.from_template(template=template)

        generate_queries = (
            prompt_rag_fusion
            | self.chat_model
            | StrOutputParser()
            | (lambda x: x.split("\n"))
        )


        retrieval_chain_rag_fusion = generate_queries | self.retriever.map()

        results = retrieval_chain_rag_fusion.invoke({"question": query})
        
        reranked_results =  self.rrf_util(results)
        
        template = """Answer the following question based on this context:
            {context}

            Question: {question}"""


        final_prompt = ChatPromptTemplate.from_template(template)


        final_rag_chain = (final_prompt
                        |    self.chat_model
                        |    StrOutputParser()
                        )


        return {"answer": final_rag_chain.invoke({"context": reranked_results, "question": query}), "context": [i["documents"] for i in reranked_results]}
        
    
    
    def __init__(self) -> None:
        self.setup()
    
    