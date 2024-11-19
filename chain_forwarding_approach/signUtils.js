const crypto = require('crypto');

// Function to sign the request data with the server's private key
function signRequest(data) {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(serverPrivateKey, 'base64');
}

// Function to verify the signature from the previous server using its public key
function verifySignature(data, signature, previousServerPublicKeyPath) {
    const previousServerPublicKey = fs.readFileSync(previousServerPublicKeyPath, 'utf8');
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(previousServerPublicKey, signature, 'base64');
}

module.exports = {signRequest, verifySignature};