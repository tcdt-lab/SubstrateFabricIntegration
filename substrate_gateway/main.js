const express = require('express');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const { BN } = require('@polkadot/util');
const axios = require('axios');
const https = require('https');
const fs = require('fs');

const app = express();
app.use(express.json());

// Load Substrate Gateway's private key and certificate for server-side SSL
const options = {
    key: fs.readFileSync('../certificates/substrate-key.pem'), // Replace with actual path
    cert: fs.readFileSync('../certificates/substrate-cert.pem'), // Replace with actual path
    ca: fs.readFileSync('../certificates/ca-cert.pem'), // Replace with actual path
    requestCert: true, // Request client's certificate
    rejectUnauthorized: false // Allow self-signed certificates for testing
};

// Create an HTTPS agent for secure requests to Fabric Gateway
const httpsAgent = new https.Agent({
    ca: fs.readFileSync('../certificates/ca-cert.pem'), // Path to the CA certificate
    cert: fs.readFileSync('../certificates/substrate-cert.pem'), // Substrate's client certificate
    key: fs.readFileSync('../certificates/substrate-key.pem'), // Substrate's private key
    rejectUnauthorized: false // Allow self-signed certificates for testing; set to `true` in production
});

// Function to call Substrate smart contract
async function callSmartContract(functionName, suri, args, gasFee) {
    const wsProvider = new WsProvider('ws://127.0.0.1:9944'); // Replace with your node's WS address
    const api = await ApiPromise.create({ provider: wsProvider });

    // Load the contract's metadata
    const metadata = require('/home/saeed/Desktop/substrate-contracts-node/target/ink/add_two_numbers/add_two_numbers.json'); // Replace with the path to your contract's metadata JSON

    // Define the contract address
    const contractAddress = '5FSoreomwVgBV6Qyvm9kArpMsenkuxuQikS4fWVysmAAsV5J'; // Replace with your contract's address

    // Create a contract instance
    const contract = new ContractPromise(api, metadata, contractAddress);

    // Create a keyring instance and add an account
    const keyring = new Keyring({ type: 'sr25519' });
    const account = keyring.addFromUri(suri); // Use the provided SURI (e.g., //Alice)

    // Define the gas limit and value to send (adjust as needed)
    const gasLimit = api.registry.createType('WeightV2', {
        refTime: new BN(gasFee),
        proofSize: new BN('100000000000')
    });

    const value = 0; // Amount of tokens to send with the contract call (if any)

    // Dynamically call the specified function
    const { gasConsumed, result, output } = await contract.query[functionName](
        account.address, // Account that is calling the contract
        { value, gasLimit }, // Options including gas limit and value
        ...args // Spread the arguments array
    );

    // Disconnect from the node
    api.disconnect();

    // Check if the call was successful and return the result
    if (result.isOk) {
        return {
            gasConsumed: gasConsumed.toString(),
            output: output.toString()
        };
    } else {
        throw new Error(result.asErr.toString());
    }
}

// Set up the invoke endpoint
app.post('/invoke', async (req, res) => {
    const { target, functionName, suri, args, gasFee } = req.body;

    try {
        if (target === "fabric") {
            // Forward the request to Fabric Gateway with mutual TLS using httpsAgent
            const result = await axios.post(
                'https://localhost:3000/invoke',
                req.body,
                { httpsAgent } // Use httpsAgent to secure the request
            );

            // Respond to the client with the result
            res.json(result.data);
        } else {
            // Call Substrate smart contract
            const result = await callSmartContract(functionName, suri, args, gasFee);
            res.json({ success: true, result });
        }
    } catch (error) {
        // Log the error for better debugging
        console.error("Error in processing request:", error.message);

        // Check if the error is an Axios error (indicating a failure in forwarding)
        if (error.response) {
            console.error("Error response from Fabric Gateway:", error.response.data);
        }

        // Respond with a 500 error and error message
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start the server with SSL/TLS configuration
https.createServer(options, app).listen(4000, () => {
    console.log("Secure Substrate Gateway listening on port 4000");
});
