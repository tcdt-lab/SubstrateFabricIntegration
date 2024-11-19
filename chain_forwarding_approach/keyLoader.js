const fs = require('fs');
const path = require('path');

function loadKey(keyPath) {
    return fs.readFileSync(keyPath, 'utf8');
}

function getKeysForServer(serverNumber) {
    const encryptionPublicKeyPath = path.join(
        '/home/saeed/Desktop/substrate-contracts-node/keys',
        `server-${serverNumber}-public-key.pem`
    );
    const encryptionPrivateKeyPath = path.join(
        '/home/saeed/Desktop/substrate-contracts-node/keys',
        `server-${serverNumber}-private-key.pem`
    );

    const signingPublicKeyPath = path.join(
        '/home/saeed/Desktop/substrate-contracts-node/signing-keys',
        `server-${serverNumber}-public-key.pem`
    );
    const signingPrivateKeyPath = path.join(
        '/home/saeed/Desktop/substrate-contracts-node/signing-keys',
        `server-${serverNumber}-private-key.pem`
    );

    return {
        encryptionPublicKey: loadKey(encryptionPublicKeyPath),
        encryptionPrivateKey: loadKey(encryptionPrivateKeyPath),
        signingPublicKey: loadKey(signingPublicKeyPath),
        signingPrivateKey: loadKey(signingPrivateKeyPath)
    };
}

module.exports = { getKeysForServer };
