// cryptoUtils.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const NodeRSA = require('node-rsa');

const keyBasePath = '/home/saeed/Desktop/substrate-contracts-node';

// AES decryption function
function decryptAES(encryptedText, key) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.alloc(16, 0));
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// RSA encryption and decryption functions
function encryptRSA(plaintext, publicKey) {
    const key = new NodeRSA(publicKey, 'public');
    return key.encrypt(plaintext, 'base64');
}

function decryptRSA(encryptedText, privateKey) {
    const key = new NodeRSA(privateKey, 'private');
    return key.decrypt(encryptedText, 'utf8');
}

function loadEncryptionKeys(serverNumber) {
    const publicKeyPath = path.join(keyBasePath, 'keys', `server-${serverNumber}-public-key.pem`);
    const privateKeyPath = path.join(keyBasePath, 'keys', `server-${serverNumber}-private-key.pem`);
    return {
        publicKey: fs.readFileSync(publicKeyPath, 'utf8'),
        privateKey: fs.readFileSync(privateKeyPath, 'utf8')
    };
}

function loadSigningKeys(serverNumber) {
    const publicKeyPath = path.join(keyBasePath, 'signing-keys', `server-${serverNumber}-public-key.pem`);
    const privateKeyPath = path.join(keyBasePath, 'signing-keys', `server-${serverNumber}-private-key.pem`);
    return {
        publicKey: fs.readFileSync(publicKeyPath, 'utf8'),
        privateKey: fs.readFileSync(privateKeyPath, 'utf8')
    };
}

module.exports = {
    loadEncryptionKeys,
    loadSigningKeys,
    decryptAES,
    encryptRSA,
    decryptRSA
};
