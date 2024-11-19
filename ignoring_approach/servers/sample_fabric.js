const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function main() {
    try {
        // Load the network configuration
        const ccpPath = '/home/saeed/Desktop/substrate-contracts-node/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json'; // Path to your connection profile
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new wallet to manage identities
        const walletPath = path.join(process.cwd(), '../../enroll_admin/wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if the user identity exists in the wallet
        const identity = await wallet.get('SampleUser'); // Replace 'user1' with your identity
        if (!identity) {
            console.log('An identity for the user "FabricUser" does not exist in the wallet');
            return;
        }

        // Create a new gateway for connecting to our peer node
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'SampleUser', discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to
        const network = await gateway.getNetwork('mychannel'); // Replace 'mychannel' with your channel name

        // Get the contract from the network
        const contract = network.getContract('fabric_cc'); // Replace 'simple_chaincode' with your chaincode name
        // Submit the specified transaction
        const result = await contract.submitTransaction('add', '10', '30'); // Replace with your function and arguments
        console.log(`Transaction has been submitted, result is: ${result.toString()}`);

        // Disconnect from the gateway
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
