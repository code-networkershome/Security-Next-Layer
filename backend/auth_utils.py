import os
import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load configuration from environment
load_dotenv()
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

security = HTTPBearer()

class User(BaseModel):
    id: str
    email: Optional[str] = None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """
    Verifies the Supabase JWT token and returns the user object.
    """
    token = credentials.credentials
    
    if not SUPABASE_JWT_SECRET:
        logger.error("SUPABASE_JWT_SECRET not found in environment")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication configuration error."
        )

    try:
        # Debug: Log the algorithm
        header = jwt.get_unverified_header(token)
        logger.info(f"JWT Header: {header}")

        # Support both HS256 (symmetric) and potentially RS256/others if configured
        # Note: True RS256 needs a public key, but we'll first try allowing the alg
        payload = jwt.decode(
            token, 
            SUPABASE_JWT_SECRET, 
            algorithms=["HS256", "RS256"], 
            audience="authenticated"
        )
        
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token: missing user ID.",
            )
            
        return User(id=user_id, email=email)
        
    except JWTError as e:
        logger.warning(f"JWT verification failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Unexpected error during JWT verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
        )
