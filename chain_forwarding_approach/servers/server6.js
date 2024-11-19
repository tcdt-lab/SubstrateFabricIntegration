const express = require('express');
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const BN = require('bn.js');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');

const PORT = 3006

const app = express();
app.use(express.json());

// Load SSL/TLS certificates for server-side SSL
const options = {
    key: fs.readFileSync('../../certs/server-6-key.pem'), // Server private key
    cert: fs.readFileSync('../../certs/server-6-cert.pem'), // Server certificate
    ca: [ // Load CA certificates for client verification if needed
        fs.readFileSync('../../certs/ca-cert.pem')
    ],
    requestCert: true, // Request client certificate; can be toggled based on security needs
    rejectUnauthorized: false // Allow self-signed certificates (set to `true` for production)
};

// Load server-specific keys
const serverPrivateKey = fs.readFileSync('../../keys/server-6-private-key.pem', 'utf8'); // Replace X with the server index

function decryptRSA(encryptedKey) {
    const buffer = Buffer.from(encryptedKey, 'base64'); // Ensure base64 decoding
    return crypto.privateDecrypt(serverPrivateKey, buffer);
}

function decryptAES (encryptedData, key) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16, 0)); 
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8'); 
    decrypted += decipher. final('utf8');
    return decrypted;
}

// Encrypt data using AES key
function encryptAES (data, key) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.alloc(16, 0)); // 16 bytes IV (initialization vector) 
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher. final ('base64');
    return encrypted;
}

// Function to re-encrypt AES key with the next server's public RSA key 
function encryptAESKeyForNextServer (aeskey, nextServerPublicKeyPath) {
    const nextServerPublicKey = fs.readFileSync(nextServerPublicKeyPath, 'utf8');
    return crypto.publicEncrypt(nextServerPublicKey, aeskey).toString('base64');
}

// Substrate contract call
async function callSubstrateContract (functionName, userSURI, args, gasFee) {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });
    const contractMetadata = require('/home/saeed/Desktop/substrate-contracts-node/target/ink/substrate_sc/substrate_sc.json'); 
    const contractAddress = '5CGsK8VfppYNKpq2juiN8ofxfHM4ixBcEH6QcYQ26w8qkjss';
    const contract = new ContractPromise (api, contractMetadata, contractAddress);
    const keyring = new Keyring({ type: 'sr25519' });
    const user = keyring.addFromUri(userSURI);
    const gasLimit = api. registry.createType('WeightV2', {
        refTime: new BN ('1000000000000'),
        proofSize: new BN ('100000000000')
    });
        const result = await contract.query[functionName](
            user.address,
            { gasLimit },
            ...args
        );
    if (result.result.isErr) {
            throw new Error(`Smart contract call failed: ${result.result.asErr.toString()}`);
    }
    const output = result.output.toJSON();
    return output;
}

async function invokeFabricChaincode (functionName, args, userSURI){ 
    try {
        const ccpPath = '/home/saeed/Desktop/substrate-contracts-node/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        const walletPath = path.join(process.cwd(), '../../enroll_admin/wallet');
        const wallet = await Wallets.newFileSystemWallet (walletPath);
        const identity = await wallet.get(userSURI);
        if (!identity) {
            console.log(`An identity for the user "${userSURI}" does not exist in the wallet`); 
            return null;
        }
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: userSURI, discovery: { enabled: true, asLocalhost: true } }); 
        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('fabric_cc');
        const result = await contract.submitTransaction (functionName, ...args);
        console.log(`Transaction has been submitted, result is: ${result.toString()}`);
        await gateway.disconnect();
        return result.toString();
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        throw error;
    }

}

function getRandomPort (excludePort) {
    const min = 3000;
    const max = 3009;
    let port;
    
    do {
        port = Math.floor(Math.random() * (max - min+1)) + min;
    } while (port === excludePort);
    
    return port;
}

function getRandomBinary() {
    return Math.floor(Math.random() * 2);
}

app.post('/invoke-smart-contract', async (req, res) => {
    try {
        const { encryptedAESKeyBase64, encryptedPayloadBase64, path = [] } = req.body;

        if (!encryptedAESKeyBase64 || !encryptedPayloadBase64) {
            console.error('Missing encrypted data fields in request body');
            return res.status(400).send({ message: 'Invalid request: Missing encrypted data fields.' });    
        }

        // Add the current server to the path
        const updatedPath = [...path, PORT];
        console.log(`Path so far: ${updatedPath.join(' -> ')}`);

        // Step 1: Decrypt AES key using server's private key
        const aeskey = decryptRSA(encryptedAESKeyBase64);

        // Step 2: Decrypt payload using AES key
        const payload = JSON.parse(decryptAES(encryptedPayloadBase64, aeskey)); 
        const { functionName, userSURI, args, network } = payload;

        // Decide to invoke locally or forward
        const shouldInvoke = getRandomBinary();
        console.log(`Decision to forward or invoke locally: ${shouldInvoke === 0 ? 'Forward' : 'Invoke locally'}`);
        if (shouldInvoke === 1) {
            // Invoke locally
            let result;
            if (network === 'fabric') {
                result = await invokeFabricChaincode(functionName, args, userSURI); 
                return res.send({
                    message: `Fabric chaincode invoked.`,
                    path: updatedPath, 
                    result
                });
            } else if (network === 'substrate') {
                result = await callSubstrateContract(functionName, userSURI, args);
                return res.send({
                    message: `Substrate smart contract invoked.`,
                    path: updatedPath,
                    result
                });
            } else {
                return res.status(400).send({ message: 'Invalid network specified.' });
            }
        } else {
            // Forward the request to another server
            const nextServerPort = getRandomPort(PORT);
            console.log(`Next server to forward to: ${nextServerPort}`);
            const nextServerPublicKeyPath = `../../keys/server-${nextServerPort % 10}-public-key.pem`; 
            const reEncryptedAESKey = encryptAESKeyForNextServer(aeskey, nextServerPublicKeyPath);

            console.log(`Forwarding request from server ${PORT} to server ${nextServerPort}`);
            
            // Forward the request and wait for the response
            const forwardedResponse = await axios.post(`https://localhost:${nextServerPort}/invoke-smart-contract`, {
                encryptedAESKeyBase64: reEncryptedAESKey,
                encryptedPayloadBase64,
                path: updatedPath // Pass along the updated path
            }, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            });

            return res.send({
                message: `Request forwarded to server ${nextServerPort}`,
                path: forwardedResponse.data.path, // Use the full path returned by the last server
                result: forwardedResponse.data.result // Send back the result from the forwarded request
            });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

https.createServer(options, app).listen(PORT, () => {
    console.log(`Server is listening on port ${PORT} with SSL`);
});




