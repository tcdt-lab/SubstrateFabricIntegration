const express = require('express');
const bodyParser = require('body-parser');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');
const { BN } = require('@polkadot/util');

async function callSmartContract(functionName, suri, args, gasFee) {
    // Connect to the Substrate node
    const wsProvider = new WsProvider('ws://127.0.0.1:9944'); // Replace with your node's WS address
    const api = await ApiPromise.create({ provider: wsProvider });

    // Load the contract's metadata
    const metadata = require('/home/saeed/Desktop/substrate-contracts-node/target/ink/add_two_numbers/add_two_numbers.json'); // Replace with the path to your contract's metadata JSON

    // Define the contract address
    const contractAddress = '5F2txeZW3fMknpv3SN7u9y8wuRxge6CAD6xQyoqyzabfbmi2'; // Replace with your contract's address

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

// Set up the Express server
const app = express();
app.use(bodyParser.json());

app.post('/invoke', async (req, res) => {
    const { functionName, suri, args, gasFee } = req.body;

    try {
        const result = await callSmartContract(functionName, suri, args, gasFee);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
