for i in {0..9}
do
    # Generate private key
    openssl genpkey -algorithm RSA -out "server-${i}-private-key.pem" -pkeyopt rsa_keygen_bits:2048

    # Generate public key
    openssl rsa -pubout -in "server-${i}-private-key.pem" -out "server-${i}-public-key.pem"

    echo "Generated keys for server ${i}"
done

# Generate private key for client
openssl genpkey -algorithm RSA -out client-private-key.pem -pkeyopt rsa_keygen_bits:2048

# Generate public key for client
openssl rsa -pubout -in client-private-key.pem -out client-public-key.pem

echo "Generated keys for client"
