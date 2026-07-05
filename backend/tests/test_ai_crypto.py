"""API Key 加解密测试。"""

from __future__ import annotations

import os

from app.services.ai.crypto import decrypt_api_key, encrypt_api_key


def test_encrypt_decrypt_roundtrip() -> None:
    os.environ["AI_KEY_ENCRYPTION_SECRET"] = "test-secret-for-fernet-key-derivation"
    plain = "sk-test-12345"
    cipher = encrypt_api_key(plain)
    assert cipher != plain
    assert decrypt_api_key(cipher) == plain
