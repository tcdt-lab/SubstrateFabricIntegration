const express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const axios = require('axios');
const https = require('https');
const fs = require('fs');

const app = express();
app.use(express.json());

// Load Fabric Gateway's private key and certificate for server-side SSL
const options = {
    key: fs.readFileSync('../certificates/fabric-key.pem'), // Replace with actual path
    cert: fs.readFileSync('../certificates/fabric-cert.pem'), // Replace with actual path
    ca: fs.readFileSync('../certificates/ca-cert.pem'), // Replace with actual path
    requestCert: true, // Request client's certificate
    rejectUnauthorized: false // Allow self-signed certificates for testing
};

// Create an HTTPS agent for secure requests to Substrate Gateway
const httpsAgent = new https.Agent({
  cert: fs.readFileSync('../certificates/fabric-cert.pem'), // Path to Fabric's client certificate
  key: fs.readFileSync('../certificates/fabric-key.pem'), // Path to Fabric's private key
  ca: fs.readFileSync('../certificates/ca-cert.pem'), // Path to the CA certificate used to sign Substrate Gateway's certificate
  rejectUnauthorized: false // Allow self-signed certificates for testing; set to `true` in production
});

// Define constants
const ccpPath = path.resolve('../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com', 'connection-org1.json'); // Replace with the path to your connection profile
const walletPath = path.join(process.cwd(), '../enroll_admin/wallet'); // Replace with the path to your wallet directory
const channelName = 'mychannel'; // Replace with your channel name
const chaincodeName = 'simple_chaincode'; // Replace with your chaincode name

// Function to invoke chaincode on Fabric
async function invokeChaincode(functionName, args) {
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const identity = await wallet.get('admin');
  if (!identity) {
    throw new Error('An identity for the user "admin" does not exist in the wallet. Register and enroll the admin before retrying.');
  }

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: 'admin',
    discovery: { enabled: true, asLocalhost: true }
  });

  const network = await gateway.getNetwork(channelName);
  const contract = network.getContract(chaincodeName);
  const result = await contract.submitTransaction(functionName, ...args);
  await gateway.disconnect();

  return result.toString();
}

// Set up the invoke endpoint
app.post('/invoke', async (req, res) => {
  const { target, functionName, args } = req.body;

  try {
    if (target === "substrate") {
      // Use the httpsAgent for secure communication with Substrate Gateway
      const result = await axios.post('https://localhost:4000/invoke', req.body, { httpsAgent });
      res.json(result.data);
    } else {
      const result = await invokeChaincode(functionName, args);
      res.json({ success: true, result });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start the server with SSL/TLS configuration
https.createServer(options, app).listen(3500, () => {
  console.log("Secure Fabric Gateway listening on port 3000");
});
