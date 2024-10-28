// client.js
const axios = require('axios');
const crypto = require('crypto');

// Generate a new AES key
function generateAESKey() {
    return crypto.randomBytes(32); // AES-256 key
}

// Encrypt data using AES key
function encryptAES(data, key) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.alloc(16, 0)); // 16 bytes IV (initialization vector)
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}

// Send encrypted request to server
async function sendRequest(functionName, userSURI, args, gasFee) {
    try {
        // Generate a new AES key
        const aesKey = generateAESKey();

        // Create the payload with all the data
        const payload = {
            functionName,
            userSURI,
            args,
            gasFee
        };

        // Encrypt the payload using the AES key
        const encryptedPayload = encryptAES(payload, aesKey);

        // Send the AES key (base64 encoded) and the encrypted payload to the server
        const response = await axios.post('https://localhost:3000/invoke-smart-contract', {
            aesKeyBase64: aesKey.toString('base64'),
            encryptedPayloadBase64: encryptedPayload
        }, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false // Accept self-signed certificates for testing
            })
        });

        console.log('Response from server:', response.data);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example usage
sendRequest('add', '//Alice', [10, 20], 100000);
