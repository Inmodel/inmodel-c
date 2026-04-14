import os
from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance for the whole app
# Disabled in test environment to avoid breaking functional tests
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute"],
    enabled=os.getenv("JUDGECHAIN_ENV") != "test"
)
