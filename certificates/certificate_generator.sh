#!/bin/bash

# Generate a CA key and certificate
openssl genrsa -out ca-key.pem 2048
openssl req -x509 -new -nodes -key ca-key.pem -sha256 -days 1024 -out ca-cert.pem -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Loop to generate server keys and certificates
for i in {0..9}
do
    # Generate server private key
    openssl genrsa -out "server-$i-private.pem" 2048

    # Generate a certificate signing request (CSR)
    openssl req -new -key "server-$i-private.pem" -out "server-$i.csr" -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

    # Generate a server certificate signed by the CA
    openssl x509 -req -in "server-$i.csr" -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out "server-$i-cert.pem" -days 500 -sha256

    # Remove CSR after generating the certificate
    rm "server-$i.csr"

    # Generate public key from the private key
    openssl rsa -in "server-$i-private.pem" -pubout -out "server-$i-pub.pem"
    
    # Set file permissions to make private keys accessible only by the owner
    chmod 600 "server-$i-private.pem"  # Private key should be private
done

echo "CA certificate and server certificates/keys generated successfully."
