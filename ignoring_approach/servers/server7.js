const express = require('express');
const https = require('https');
const fs = require('fs');
const crypto = require('crypto');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const BN = require('bn.js');
const path = require('path');
const { Gateway, Wallets } = require('fabric-network');

const app = express();
app.use(express.json());

// Load SSL/TLS certificates for server-side SSL
const options = {
    key: fs.readFileSync('../../certs/server-7-key.pem'),
    cert: fs.readFileSync('../../certs/server-7-cert.pem'),
    ca: fs.readFileSync('../../certs/ca-cert.pem'),
    requestCert: true,
    rejectUnauthorized: false // For self-signed certificates in development; set to `true` in production
};

// Load server's RSA private key
const serverPrivateKey = fs.readFileSync('../../keys/server-7-private-key.pem', 'utf8');

// Load server's signing private key (adjusted for signing purposes)
const serverSigningPrivateKey = fs.readFileSync('/home/saeed/Desktop/substrate-contracts-node/signing-keys/server-7-private-key.pem', 'utf8');

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

// Sign the response with the server's private signing key
function signResponse(data) {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(serverSigningPrivateKey, 'base64');
}

// Substrate contract call (same as before)
async function callSubstrateContract(functionName, userSURI, args, gasFee) {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });
    const contractMetadata = require('/home/saeed/Desktop/substrate-contracts-node/target/ink/substrate_sc/substrate_sc.json');
    const contractAddress = '5GxvYW3Q1gemKscDqJQLPFVDTNRj33Sec4KbCgyvzoXwvrho';
    const contract = new ContractPromise(api, contractMetadata, contractAddress);
    const keyring = new Keyring({ type: 'sr25519' });
    const user = keyring.addFromUri(userSURI);

    const gasLimit = api.registry.createType('WeightV2', {
        refTime: new BN('1000000000000'),
        proofSize: new BN('100000000000')
    });

    const result = await contract.query[functionName](
        user.address,
        { gasLimit },
        ...args
    );

    if (result.result.isErr) {
        throw new Error(`Smart contract call failed: ${result.result.asErr.toString()}`);
    }

    return result.output.toJSON();
}

// Fabric chaincode invocation (same as before)
async function invokeFabricChaincode(functionName, args, userSURI) {
    try {
        const ccpPath = '/home/saeed/Desktop/substrate-contracts-node/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const walletPath = path.join(process.cwd(), '../../enroll_admin/wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const identity = await wallet.get(userSURI);

        if (!identity) {
            console.log(`An identity for the user "${userSURI}" does not exist in the wallet`);
            return null;
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: userSURI, discovery: { enabled: true, asLocalhost: true } });

        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('fabric_cc');
        const result = await contract.submitTransaction(functionName, ...args);
        await gateway.disconnect();

        return result.toString();
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        throw error;
    }
}

app.post('/invoke-smart-contract', async (req, res) => {
    try {
        const { encryptedAESKeyBase64, encryptedPayloadBase64 } = req.body;

        if (!encryptedAESKeyBase64 || !encryptedPayloadBase64) {
            return res.status(400).send({ message: 'Invalid request: Missing encrypted data fields.' });
        }

        const aesKey = decryptRSA(encryptedAESKeyBase64);
        const payload = JSON.parse(decryptAES(encryptedPayloadBase64, aesKey));
        const { ignore, functionName, userSURI, args, network } = payload;

        if (ignore) {
            return res.send({ message: 'Request ignored.' });
        }

        let result;
        if (network === 'fabric') {
            result = await invokeFabricChaincode(functionName, args, userSURI);
        } else if (network === 'substrate') {
            result = await callSubstrateContract(functionName, userSURI, args);
        } else {
            return res.status(400).send({ message: 'Invalid network specified.' });
        }

        const signature = signResponse(JSON.stringify(result));

        return res.send({
            message: 'Smart contract invoked.',
            result,
            signature // Include the signature in the response
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Start the HTTPS server with SSL/TLS
https.createServer(options, app).listen(3007, () => {
    console.log('Server is listening on port 3000 with SSL');
});