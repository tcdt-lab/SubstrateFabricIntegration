import hashlib
import random
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature, decode_dss_signature
from cryptography.hazmat.backends import default_backend
from typing import List, Tuple

# Step 1: Generate ECC key pairs for each entity
def generate_ecc_key_pair():
    private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())  # Generate ECC key pair
    public_key = private_key.public_key()
    return private_key, public_key

# Step 2: Define a function for creating a hash of a message
def hash_message(message: str) -> bytes:
    return hashlib.sha256(message.encode()).digest()

# Step 3: Define a function to create a ring signature
def ring_sign(message: str, private_key, public_keys: List, signer_index: int) -> Tuple[List, bytes]:
    n = len(public_keys)
    message_hash = hash_message(message)

    # Generate random values for the ring
    ring_signature = [None] * n
    random_values = [random.randint(1, 100) for _ in range(n)]

    # Generate a random value to start the chain
    u = random.randint(1, 100)
    
    # Simulate the ring by iterating through the public keys and forming the ring signature
    for i in range(n):
        if i == signer_index:
            # The actual signer uses their private key to sign the hash
            signature = private_key.sign(
                message_hash,
                ec.ECDSA(hashes.SHA256())
            )
            r, s = decode_dss_signature(signature)
            ring_signature[i] = (r, s)
        else:
            # Other members just add random values
            ring_signature[i] = (random_values[i], random_values[i] * 2)
    
    # Return the ring signature along with the starting value
    return ring_signature, u

# Step 4: Define a function to verify the ring signature
def ring_verify(message: str, ring_signature: List, public_keys: List, u: bytes) -> bool:
    message_hash = hash_message(message)
    n = len(public_keys)

    # Simulate the verification process by verifying against each public key
    for i, public_key in enumerate(public_keys):
        try:
            r, s = ring_signature[i]
            signature = encode_dss_signature(r, s)
            public_key.verify(
                signature,
                message_hash,
                ec.ECDSA(hashes.SHA256())
            )
        except Exception:
            # If any signature fails to verify, the ring signature is invalid
            return False
    
    return True

# Step 5: Example usage with four servers/entities

# Generate key pairs for four servers
servers = [generate_ecc_key_pair() for _ in range(4)]
private_keys = [server[0] for server in servers]
public_keys = [server[1] for server in servers]

# Display public keys
print("Public keys:")
for idx, pub_key in enumerate(public_keys):
    pub_pem = pub_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    print(f"Server {idx + 1} public key:\n{pub_pem.decode('utf-8')}")

# Server 1 signs the message using its private key
message = "Request received, processing it."
signer_index = 0  # Server 1 is the signer

# Create a ring signature
ring_sig, u = ring_sign(message, private_keys[signer_index], public_keys, signer_index)
print("\nRing Signature:", ring_sig)

# Verify the ring signature
is_valid = ring_verify(message, ring_sig, public_keys, u)
print(f"\nRing Signature Valid: {is_valid}")
