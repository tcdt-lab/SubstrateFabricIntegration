// networkClients.js

const { Gateway, Wallets } = require('fabric-network');
const { ApiPromise, WsProvider } = require('@polkadot/api');

// Fabric chaincode invocation
async function invokeFabricChaincode(functionName, args, userSURI) {
    try {
        const ccpPath = '/home/saeed/Desktop/substrate-contracts-node/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json';
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        const walletPath = path.join(process.cwd(), '/home/saeed/Desktop/substrate-contracts-node/enroll_admin/wallet');
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
        console.log(`Transaction has been submitted, result is: ${result.toString()}`);

        await gateway.disconnect();

        return result.toString();
    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        throw error;
    }
}

// Substrate contract call
async function callSubstrateContract(functionName, userSURI, args, gasFee) {
    const provider = new WsProvider('ws://127.0.0.1:9944');
    const api = await ApiPromise.create({ provider });
    const contractMetadata = require('/home/saeed/Desktop/substrate-contracts-node/target/ink/substrate_sc/substrate_sc.json');
    const contractAddress = '5DCVv4pNrUVpF87T2YNqYkQHoSUdx4Tt7auU2xh5Wu3RPbPu';

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

    const output = result.output.toJSON();
    return output;
}

module.exports = { invokeFabricChaincode, callSubstrateContract };
