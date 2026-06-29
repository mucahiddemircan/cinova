from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Optional

from app.services.chatbot_service import chatbot_engine

router = APIRouter(prefix="/support", tags=["support"])

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

@router.post("/chat")
async def support_chat(request: ChatRequest = Body(...)):
    """Receives chatbot message and returns response via Gemini."""
    if not request.message:
        raise HTTPException(status_code=400, detail="Message is required")
        
    # Convert history to list of dicts
    history_dicts = [msg.dict() for msg in request.history] if request.history else []
    
    response = await chatbot_engine.get_chat_response(request.message, history=history_dicts)
    
    return {"response": response}
