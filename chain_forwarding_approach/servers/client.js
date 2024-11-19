const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');

// Load the public RSA keys of all servers for encryption
const serverPublicKeys = [
    fs.readFileSync('../../keys/server-0-public-key.pem', 'utf8'),
    fs.readFileSync('../../keys/server-1-public-key.pem', 'utf8'),
    fs.readFileSync('../../keys/server-2-public-key.pem', 'utf8'),
    fs.readFileSync('../../keys/server-3-public-key.pem', 'utf8'),
    fs.readFileSync('../../keys/server-4-public-key.pem', 'utf8'),
    fs.readFileSync('../../keys/server-5-public-key.pem', 'utf8'),
    fs.readFileSync('../../keys/server-6-public-key.pem', 'utf8'),
    fs.readFileSync('../../keys/server-7-public-key.pem', 'utf8'),
    fs.readFileSync('../../keys/server-8-public-key.pem', 'utf8'),
    fs.readFileSync('../../keys/server-9-public-key.pem', 'utf8'),
];

// Generate a new AES key
function generateAESKey() {
    return crypto.randomBytes(32); // AES-256 key (32 bytes)
}

// Encrypt AES key with RSA (server's public key)
function encryptRSA (key, publicKey) {
    const buffer = Buffer.from (key);
    return crypto.publicEncrypt (publicKey, buffer);
}

// Encrypt data using AES key
function encryptAES (data, key) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.alloc(16, 0)); // 16 bytes IV (initialization vector) 
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher. final ('base64');
    return encrypted;
}

async function sendRequest(serverPort, selectedPublicKey, functionName, userSURI, args, gasFee, network) { 
    try {
        // Generate a new AES key
        const aeskey = generateAESKey();
        // Encrypt the AES key using the selected server's public RSA key 
        const encryptedAESKey = encryptRSA(aeskey, selectedPublicKey);

        // Create the payload with all the data, including initializing the path
        const payload = {
            functionName,
            userSURI,
            args,
            gasFee,
            network,
            path: [] // Initialize an empty path array
        };
        const encryptedPayload = encryptAES(payload, aeskey);
        
        // Convert the encrypted values to base64
        const encryptedAESKeyBase64 = encryptedAESKey.toString('base64');

        // Construct server address
        const serverAddress = `https://localhost:${serverPort}/invoke-smart-contract`;
        // Send the RSA-encrypted AES key and the AES-encrypted payload to the server
        const response = await axios.post(serverAddress, {
            encryptedAESKeyBase64: encryptedAESKeyBase64, 
            encryptedPayloadBase64: encryptedPayload
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

function chooseRandomNetwork() {
    return Math.random() > 0.5 ? 'fabric': 'substrate';
}

// Send requests to random servers
async function sendRandomRequests() {
    for (let i = 0; i < 10; i++) {
    // Randomly select a server index
    const serverIndex = Math.floor(Math.random() * serverPublicKeys.length); const selectedPublicKey = serverPublicKeys [serverIndex];
    // Randomly choose network
    const network = chooseRandomNetwork();
    // Define functionName and args
    const functionName = 'add';
    let userSURI = null;
    let args;
    if (network === 'fabric') {
        args = ['10', '20'];
        userSURI = 'SampleUser';
    } 
    else if (network ==='substrate') {
        args = [10, 20];
        userSURI = '//Alice';
    }
    // Send the request to the randomly chosen server
    await sendRequest (3000+ serverIndex, selectedPublicKey, functionName, userSURI, args, 0, network);
    }
}

sendRandomRequests();