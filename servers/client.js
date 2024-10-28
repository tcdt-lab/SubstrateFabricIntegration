const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');

// Load public RSA keys for all servers
const serverPublicKeys = [
    fs.readFileSync('../keys/server-0-public-key.pem', 'utf8'),
    fs.readFileSync('../keys/server-1-public-key.pem', 'utf8'),
    fs.readFileSync('../keys/server-2-public-key.pem', 'utf8'),
    fs.readFileSync('../keys/server-3-public-key.pem', 'utf8'),
    fs.readFileSync('../keys/server-4-public-key.pem', 'utf8'),
    fs.readFileSync('../keys/server-5-public-key.pem', 'utf8'),
    fs.readFileSync('../keys/server-6-public-key.pem', 'utf8'),
    fs.readFileSync('../keys/server-7-public-key.pem', 'utf8'),
    fs.readFileSync('../keys/server-8-public-key.pem', 'utf8'),
    fs.readFileSync('../keys/server-9-public-key.pem', 'utf8'),
];

// Generate a new AES key
function generateAESKey() {
    return crypto.randomBytes(32); // AES-256 key (32 bytes)
}

// Encrypt AES key with RSA (server's public key)
function encryptRSA(key, publicKey) {
    const buffer = Buffer.from(key);
    return crypto.publicEncrypt(publicKey, buffer);
}

// Encrypt data using AES key
function encryptAES(data, key) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.alloc(16, 0)); // 16 bytes IV (initialization vector)
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}

// Send encrypted request to the selected server
async function sendRequest(serverPort, selectedPublicKey, functionName, userSURI, args, gasFee, network) {
    try {
        // Generate a new AES key
        const aesKey = generateAESKey();

        // Encrypt the AES key using the selected server's public RSA key
        const encryptedAESKey = encryptRSA(aesKey, selectedPublicKey);

        // Create the payload with all the data
        const payload = {
            functionName,
            userSURI,
            args,
            gasFee,
            network  // Specify "fabric" or "substrate"
        };

        // Encrypt the payload using the AES key
        const encryptedPayload = encryptAES(payload, aesKey);

        // Convert the encrypted values to base64
        const encryptedAESKeyBase64 = encryptedAESKey.toString('base64');
        const encryptedPayloadBase64 = encryptedPayload;

        // Construct server address
        const serverAddress = `https://localhost:${serverPort}/invoke-smart-contract`;
        console.log("Sending request to:", serverAddress);

        // Send the RSA-encrypted AES key and the AES-encrypted payload to the selected server
        const response = await axios.post(serverAddress, {
            encryptedAESKeyBase64: encryptedAESKeyBase64,
            encryptedPayloadBase64: encryptedPayloadBase64
        }, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false // Accept self-signed certificates for testing
            })
        });

        console.log(`Response from server ${serverPort}:`, response.data);
    } catch (error) {
        if (error.response) {
            console.error(`Error from server ${serverPort}:`, error.response.status, error.response.data);
        } else {
            console.error(`Error ${serverPort}:`, error.message);
        }
    }
}

// Randomly choose between Fabric and Substrate
function chooseRandomNetwork() {
    return Math.random() > 0.5 ? 'fabric' : 'substrate';
}

async function sendRandomRequests() {
    const requests = [];

    for (let i = 0; i < 10; i++) {
        // Choose a random server index
        const serverIndex = Math.floor(Math.random() * serverPublicKeys.length);
        const serverPort = 3000 + serverIndex;
        const selectedPublicKey = serverPublicKeys[serverIndex];

        // Randomly choose either Fabric or Substrate for each request
        const network = chooseRandomNetwork();

        // Define functionName and args
        const functionName = 'add';
        let userSURI = null;
        let args;
        
        if (network === 'fabric') {
            args = ['10', '20'];
            userSURI = 'SampleUser'; // Ensure this is the actual identity in your wallet
        } else if (network === 'substrate') {
            args = [10, 20];
            userSURI = '//Alice';
        }

        // Send request to the server
        const requestPromise = sendRequest(serverPort, selectedPublicKey, functionName, userSURI, args, null, network);
        requests.push(requestPromise);
    }

    // Wait for all requests to complete
    await Promise.all(requests);
}

// Run the random requests
sendRandomRequests();
