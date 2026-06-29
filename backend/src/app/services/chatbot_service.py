import os
import logging
from typing import List, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from app.core.config import settings

class ChatbotService:
    def __init__(self):
        # gemini-3.1-flash-lite is the model with the highest quotas on the free plan in 2026
        self.model_name = "gemini-3.1-flash-lite"
        self.api_key = settings.GOOGLE_API_KEY
        self._context = self._load_context()
        self._llm = None
        
        if self.api_key and "AIza" in self.api_key:
            try:
                self._llm = ChatGoogleGenerativeAI(
                    model=self.model_name,
                    google_api_key=self.api_key,
                    temperature=0.3,
                    max_output_tokens=1024,
                )
                logging.info(f"ChatbotService: {self.model_name} initialized.")
            except Exception as e:
                logging.error(f"ChatbotService Initialization Failed: {e}")
        else:
            logging.warning("ChatbotService: GOOGLE_API_KEY not found. AI Chat will be disabled.")

    def _load_context(self) -> str:
        """Loads the support_context.md file."""
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            context_path = os.path.join(base_dir, "core", "support_context.md")
            
            if os.path.exists(context_path):
                with open(context_path, "r", encoding="utf-8") as f:
                    return f.read()
            return "No context available."
        except Exception as e:
            logging.error(f"Failed to load support context: {e}")
            return "No context available."

    async def get_chat_response(self, user_message: str, history: List[Dict[str, str]] = None) -> str:
        """Generates response to user message with Gemini."""
        if not self._llm:
            return "Üzgünüm, şu an teknik bir sorundan dolayı cevap veremiyorum. Lütfen daha sonra tekrar deneyin veya destek ekibiyle iletişime geçin."

        # Prompt preparation
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"You are a helpful support assistant for the Cinova project. "
                       f"Use the following context to answer the user's questions accurately. "
                       f"IMPORTANT: Do NOT use any markdown formatting (like **bold**, # headers, or markdown lists). "
                       f"Use only PLAIN TEXT. Keep your responses concise and friendly. "
                       f"If the question is not related to Cinova or is not in the context, "
                       f"be polite but firm that you are here only for Cinova support. "
                       f"Always respond in the SAME language as the user's input (Turkish or English). "
                       f"\n\nCONTEXT:\n{self._context}"),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}")
        ])

        # Convert message history
        chat_history = []
        if history:
            for msg in history:
                if msg["role"] == "user":
                    chat_history.append(HumanMessage(content=msg["content"]))
                else:
                    chat_history.append(AIMessage(content=msg["content"]))

        # Run the chain
        chain = prompt | self._llm
        
        try:
            response = await chain.ainvoke({
                "input": user_message,
                "history": chat_history
            })
            
            # Check response type (next-gen models might return lists)
            if isinstance(response.content, list):
                content = "".join([part.get("text", "") if isinstance(part, dict) else str(part) for part in response.content])
            else:
                content = response.content if response.content else ""
            
            content = content.strip()
            if not content:
                return "Üzgünüm, bu konuda size yardımcı olamıyorum. Lütfen sorunuzu farklı bir şekilde sormayı deneyin."
                
            return content
        except Exception as e:
            error_msg = str(e)
            logging.error(f"Chatbot AI Error: {error_msg}")
            
            if "429" in error_msg or "quota" in error_msg.lower() or "RESOURCE_EXHAUSTED" in error_msg:
                return "Üzgünüm, şu an çok fazla istek aldım ve günlük kotam doldu. Lütfen birkaç dakika sonra tekrar deneyin veya başka bir konuda yardımcı olmamı isterseniz bekleyin."
                
            return "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin."

# Singleton instance
chatbot_engine = ChatbotService()
