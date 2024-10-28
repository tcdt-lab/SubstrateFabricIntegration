mkdir -p keys
cd keys

for i in {0..9}
do
    # Generate RSA private key
    openssl genpkey -algorithm RSA -out server-$i-private-key.pem -pkeyopt rsa_keygen_bits:2048

    # Extract the public key from the private key
    openssl rsa -pubout -in server-$i-private-key.pem -out server-$i-public-key.pem
done
