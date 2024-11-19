const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');

// Connect to the Substrate node
const provider = new WsProvider('ws://127.0.0.1:9944');
const api = await ApiPromise.create({ provider });

// Load contract metadata and create a contract object
const contractMetadata = require('./path/to/your/contract.json'); // Path to your metadata
const contractAddress = '5FtrVvkbdd3fmfpnFukDMXtKzGQRHmA5cnZLMps3HWn8Ma3C'; // Your contract address
const contract = new ContractPromise(api, contractMetadata, contractAddress);

// Call the `add` function
const addResult = await contract.query.add(yourAddress, { gasLimit: -1 }, 10, 20);
console.log('Add Result:', addResult.output.toString());

// Call the `get_result` function
const getResult = await contract.query.get_result(yourAddress, { gasLimit: -1 }, 10, 20);
console.log('Stored Result:', getResult.output.toString());
