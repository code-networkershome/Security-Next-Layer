import os
import logging
import requests
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from pydantic import BaseModel

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load configuration from environment
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

security = HTTPBearer()

# Cache for JWKS keys
_jwks_cache: Dict[str, Any] = {}

def get_jwks():
    """Fetch JWKS keys from Supabase"""
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    
    if not SUPABASE_URL:
        logger.warning("SUPABASE_URL not set, cannot fetch JWKS")
        return {}
    
    try:
        jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        response = requests.get(jwks_url, timeout=5)
        response.raise_for_status()
        data = response.json()
        _jwks_cache = {key['kid']: key for key in data.get('keys', [])}
        logger.info(f"Fetched {len(_jwks_cache)} keys from JWKS")
        return _jwks_cache
    except Exception as e:
        logger.error(f"Failed to fetch JWKS: {e}")
        return {}

class User(BaseModel):
    id: str
    email: Optional[str] = None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """
    Verifies the Supabase JWT token and returns the user object.
    Supports both HS256 (symmetric) and JWKS-based asymmetric algorithms (ES256, RS256).
    """
    token = credentials.credentials
    
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg")
        kid = header.get("kid")
        
        # Determine the key to use
        key = None
        if alg == "HS256":
            if not SUPABASE_JWT_SECRET:
                logger.error("SUPABASE_JWT_SECRET not found for HS256 token")
                raise HTTPException(status_code=500, detail="Authentication configuration error.")
            key = SUPABASE_JWT_SECRET
        elif alg in ["ES256", "RS256"]:
            jwks = get_jwks()
            if kid and kid in jwks:
                # Construct the public key from JWK
                key = jwk.construct(jwks[kid])
            else:
                logger.warning(f"KID {kid} not found in JWKS for {alg} token")
                # If we can't find the kid, we'll try to use the secret as a PEM (jose does this automatically if it looks like one)
                key = SUPABASE_JWT_SECRET
        else:
            raise HTTPException(status_code=401, detail=f"Unsupported algorithm: {alg}")

        if not key:
            raise HTTPException(status_code=401, detail="Could not find verification key.")

        payload = jwt.decode(
            token, 
            key, 
            algorithms=["HS256", "RS256", "ES256"], 
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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during JWT verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
        )
