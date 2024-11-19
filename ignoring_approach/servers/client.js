const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');

// Load public RSA keys for all servers (for encryption)
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

// Load server's signing public keys
const serverSigningPublicKeys = [
    fs.readFileSync('../../signing-keys/server-0-public-key.pem', 'utf8'),
    fs.readFileSync('../../signing-keys/server-1-public-key.pem', 'utf8'),
    fs.readFileSync('../../signing-keys/server-2-public-key.pem', 'utf8'),
    fs.readFileSync('../../signing-keys/server-3-public-key.pem', 'utf8'),
    fs.readFileSync('../../signing-keys/server-4-public-key.pem', 'utf8'),
    fs.readFileSync('../../signing-keys/server-5-public-key.pem', 'utf8'),
    fs.readFileSync('../../signing-keys/server-6-public-key.pem', 'utf8'),
    fs.readFileSync('../../signing-keys/server-7-public-key.pem', 'utf8'),
    fs.readFileSync('../../signing-keys/server-8-public-key.pem', 'utf8'),
    fs.readFileSync('../../signing-keys/server-9-public-key.pem', 'utf8'),
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

// Verify the RSA signature
function verifyRSASignature(data, signature, publicKey) {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
}

// Send encrypted request to a specific server
async function sendRequest(serverPort, selectedPublicKey, functionName, userSURI, args, network, ignore) {
    try {
        // Generate a new AES key
        const aesKey = generateAESKey();

        // Encrypt the AES key using the selected server's public RSA key
        const encryptedAESKey = encryptRSA(aesKey, selectedPublicKey);

        // Create the payload with all the data, including 'ignore'
        const payload = {
            functionName,
            userSURI,
            args,
            network,  // Specify "fabric" or "substrate"
            ignore    // Only one server will have ignore set to false
        };

        // Encrypt the payload using the AES key
        const encryptedPayload = encryptAES(payload, aesKey);

        // Convert the encrypted values to base64
        const encryptedAESKeyBase64 = encryptedAESKey.toString('base64');
        const encryptedPayloadBase64 = encryptedPayload;

        // Construct server address
        const serverAddress = `https://localhost:${serverPort}/invoke-smart-contract`;

        // Send the RSA-encrypted AES key and the AES-encrypted payload to the server
        const response = await axios.post(serverAddress, {
            encryptedAESKeyBase64: encryptedAESKeyBase64,
            encryptedPayloadBase64: encryptedPayloadBase64
        }, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false // Accept self-signed certificates for testing
            })
        });

        // Check if the response contains 'result' and 'signature' before proceeding
        const { result, signature, message } = response.data;

        // If the message is 'Request ignored', handle it differently
        if (message === 'Request ignored') {
            console.log(`Server ${serverPort} ignored the request.`);
            return;
        }

        // If the response contains 'result' and 'signature', proceed to verify
        if (result && signature) {
            const serverIndex = serverPort - 3000; // Assuming serverPort starts at 3000 for server-0

            // Convert result to string
            const responseData = JSON.stringify(result);

            // Verify the signature using the corresponding server's public signing key
            const isValid = verifyRSASignature(responseData, signature, serverSigningPublicKeys[serverIndex]);
            
            if (isValid) {
                console.log('Signature is valid. Response is authentic.');
                console.log('Server Response:', result);
            } else {
                console.log('Invalid signature. The response may have been tampered with!');
            }
        } else {
            console.log(`Server ${serverPort} did not provide valid response data.`);
        }
    } catch (error) {
        if (error.response) {
            console.error(`Error from server ${serverPort}:`, error.response.status, error.response.data);
        } else {
            console.error(`Error from server ${serverPort}:`, error.message);
        }
    }
}

// Randomly choose between Fabric and Substrate
function chooseRandomNetwork() {
    return Math.random() > 0.5 ? 'fabric' : 'substrate';
}

// Send requests to all servers
async function sendRequestsToAllServers() {
    const requests = [];

    for (let i = 0; i < 10; i++) {
        const respondingServerIndex = Math.floor(Math.random() * serverPublicKeys.length);
        const network = chooseRandomNetwork();

        const functionName = 'add';
        let userSURI = null;
        let args;
        
        if (network === 'fabric') {
            args = ['10', '20'];
            userSURI = 'SampleUser';
        } else if (network === 'substrate') {
            args = [10, 20];
            userSURI = '//Alice';
        }

        for (let j = 0; j < serverPublicKeys.length; j++) {
            const serverPort = 3000 + j;
            const selectedPublicKey = serverPublicKeys[j];
            const ignore = j !== respondingServerIndex;

            const requestPromise = sendRequest(serverPort, selectedPublicKey, functionName, userSURI, args, network, ignore);
            requests.push(requestPromise);
        }
    }

    await Promise.all(requests);
}

// Run the requests to all servers
sendRequestsToAllServers();
