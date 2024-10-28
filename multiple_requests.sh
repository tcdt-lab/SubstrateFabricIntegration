#!/bin/bash

# Integrated Gateway Invoker Script

# Set default values for arguments
TARGET="fabric"  # Default target network
FUNCTION_NAME="AddNumbers" # Default function name for Fabric
ARGS=("10" "20") # Default arguments for Fabric
SURI="//Alice"   # Default SURI for Substrate
GAS_FEE="1000000000000" # Default gas fee for Substrate

# Define the integrated gateway endpoint
INTEGRATED_GATEWAY_URL="https://localhost:3100/invoke"

# Parse command-line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --target) TARGET="$2"; shift ;;                  # Set target network (fabric or substrate)
        --functionName) FUNCTION_NAME="$2"; shift ;;    # Set function name
        --args) IFS=',' read -r -a ARGS <<< "$2"; shift ;;  # Comma-separated list of arguments
        --suri) SURI="$2"; shift ;;                       # Set SURI for Substrate
        --gasFee) GAS_FEE="$2"; shift ;;                 # Set gas fee for Substrate
        *) echo "Unknown parameter passed: $1"; exit 1 ;; # Error on unknown parameters
    esac
    shift
done

# Create JSON payload for the integrated gateway
if [ "$TARGET" == "substrate" ]; then
    JSON_PAYLOAD=$(cat <<EOF
{
    "target": "$TARGET",
    "functionName": "$FUNCTION_NAME",
    "args": [${ARGS[@]}],
    "suri": "$SURI",
    "gasFee": "$GAS_FEE"
}
EOF
)
else
    # Assume Fabric when TARGET is not 'substrate'
    JSON_PAYLOAD=$(cat <<EOF
{
    "target": "$TARGET",
    "functionName": "$FUNCTION_NAME",
    "args": [${ARGS[@]}]
}
EOF
)
fi

# Invoke the integrated gateway
echo "Sending request to Integrated Gateway..."
RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" --data "$JSON_PAYLOAD" --insecure $INTEGRATED_GATEWAY_URL)

# Display the response
echo "Response from Integrated Gateway:"
echo "$RESPONSE"

