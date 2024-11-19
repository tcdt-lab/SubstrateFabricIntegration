#!/bin/bash

# Default contract address
DEFAULT_CONTRACT_ADDRESS='5CaR87HiKUD6LBPsUDAfW7dNgvZ5QzpAZLw58N7r4wzvRxab'

# If an argument is provided, use it as the contract address; otherwise, use the default
CONTRACT_ADDRESS=${1:-$DEFAULT_CONTRACT_ADDRESS}

# Loop to run each server with the contract address passed as an environment variable
for i in {0..9}; do
    PORT=$((3000 + i))
    echo "Starting server on port $PORT with contract address $CONTRACT_ADDRESS"
    CONTRACT_ADDRESS=$CONTRACT_ADDRESS PORT=$PORT node "server$i.js" &
done

# Wait for all background processes to finish
wait
