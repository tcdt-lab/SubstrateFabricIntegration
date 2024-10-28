mkdir -p certificates
cd certificates

# Generate CA private key
openssl genpkey -algorithm RSA -out ca-key.pem -pkeyopt rsa_keygen_bits:2048

# Generate CA certificate
openssl req -x509 -new -nodes -key ca-key.pem -sha256 -days 365 -out ca-cert.pem -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=YourCA"

for i in {0..9}
do
    # Generate server private key
    openssl genpkey -algorithm RSA -out server-$i-key.pem -pkeyopt rsa_keygen_bits:2048

    # Create a certificate signing request (CSR)
    openssl req -new -key server-$i-key.pem -out server-$i-csr.pem -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost:$((3000+i))"

    # Generate the self-signed certificate using the CA
    openssl x509 -req -in server-$i-csr.pem -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out server-$i-cert.pem -days 365 -sha256

    # Clean up the CSR file
    rm server-$i-csr.pem
done
