const express = require('express');
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const BN = require('bn.js');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const app = express();
app.use(express.json());

// Load SSL/TLS certificates for server-side SSL
const options = {
    key: fs.readFileSync('../certs/server-0-key.pem'),
    cert: fs.readFileSync('../certs/server-0-cert.pem'),
    ca: fs.readFileSync('../certs/ca-cert.pem'),
    requestCert: true,
    rejectUnauthorized: false // For self-signed certificates in development; set to `true` in production
};

function isFabricRequest(functionName) {
    // Define your logic to identify Fabric chaincode functions
    const fabricFunctions = ['invokeChaincode', 'add', 'subtract']; // Add the functions that belong to your Fabric chaincode
    return fabricFunctions.includes(functionName);
}

// Load server's RSA private key
const serverPrivateKey = fs.readFileSync('../keys/server-0-private-key.pem', 'utf8');

// Decrypt AES key using the server's private RSA key
function decryptRSA(encryptedKey) {
    const buffer = Buffer.from(encryptedKey, 'base64'); // Ensure base64 decoding
    return crypto.privateDecrypt(serverPrivateKey, buffer);
}


// Decrypt AES-encrypted data
function decryptAES(encryptedData, key) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Substrate contract call
async function callSubstrateContract(functionName, userSURI, args, gasFee) {
    // Connect to the Substrate node
    const provider = new WsProvider('ws://127.0.0.1:9944');

    const api = await ApiPromise.create({ provider });

    // Load the contract's metadata (from the contract's compiled JSON file)
    const contractMetadata = require('/home/saeed/Desktop/substrate-contracts-node/target/ink/substrate_sc/substrate_sc.json'); // Path to the metadata file
    const contractAddress = '5FtrVvkbdd3fmfpnFukDMXtKzGQRHmA5cnZLMps3HWn8Ma3C'; // Replace with your contract address

    // Create the contract object
    const contract = new ContractPromise(api, contractMetadata, contractAddress);

    // Create a keyring instance and add the user's keypair
    const keyring = new Keyring({ type: 'sr25519' });
    const user = keyring.addFromUri(userSURI); // This will use the user's SURI (e.g., "//Alice")

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: new BN('1000000000000'), // Increase refTime
        proofSize: new BN('100000000000')  // Keep proofSize as it is
    });

    const result = await contract.query[functionName](
        user.address,
        { gasLimit },
        ...args
    );
    

    // Check if the result contains an error
    if (result.result.isErr) {
        throw new Error(`Smart contract call failed: ${result.result.asErr.toString()}`);
    }

    // Return the actual output from the contract call
    const output = result.output.toJSON(); // Convert the output to JSON
    return output;
}

async function invokeFabricChaincode(functionName, args, userSURI) {
    try {
        const ccpPath = '/home/saeed/Desktop/substrate-contracts-node/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const walletPath = path.join(process.cwd(), '../enroll_admin/wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const identity = await wallet.get(userSURI);
        if (!identity) {
            console.log(`An identity for the user "${userSURI}" does not exist in the wallet`);
            return null;  // Return null if identity doesn't exist
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: userSURI, discovery: { enabled: true, asLocalhost: true } });

        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('fabric_cc');

        // Submit the specified transaction
        const result = await contract.submitTransaction(functionName, ...args); // Spread operator for args
        console.log(`Transaction has been submitted, result is: ${result.toString()}`);

        // Disconnect from the gateway
        await gateway.disconnect();

        return result.toString();  // Return the result as a string
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        throw error;  // Rethrow the error to handle it in the calling function
    }
}



app.post('/invoke-smart-contract', async (req, res) => {
    try {
        const { encryptedAESKeyBase64, encryptedPayloadBase64 } = req.body;

        if (!encryptedAESKeyBase64 || !encryptedPayloadBase64) {
            console.error('Missing encrypted data fields in request body');
            return res.status(400).send({ message: 'Invalid request: Missing encrypted data fields.' });
        }

        const aesKey = decryptRSA(encryptedAESKeyBase64, serverPrivateKey);
        const payload = JSON.parse(decryptAES(encryptedPayloadBase64, aesKey));
        const { ignore, functionName, userSURI, args, network } = payload;

        if (ignore) {
            return res.send({ message: 'Request ignored.' });
        }

        if (network === 'fabric') {
            const fabricResult = await invokeFabricChaincode(functionName, args, userSURI);
            return res.send({ message: 'Fabric chaincode invoked.', result: fabricResult });
        } else if (network === 'substrate') {
            const substrateResult = await callSubstrateContract(functionName, userSURI, args);
            return res.send({ message: 'Substrate smart contract invoked.', result: substrateResult });
        } else {
            return res.status(400).send({ message: 'Invalid network specified.' });
        }

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});



// Start the HTTPS server with SSL/TLS
https.createServer(options, app).listen(3000, () => {
    console.log('Server is listening on port 3000 with SSL');
});
