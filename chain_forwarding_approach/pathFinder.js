// Random port generation
function getRandomPort(excludePort) {
    const min = 3000;
    const max = 3009;
    let port;

    do {
        port = Math.floor(Math.random() * (max - min + 1)) + min;
    } while (port === excludePort);

    return port;
}

// Random binary (either 0 or 1)
function getRandomBinary() {
    return Math.floor(Math.random() * 2);
}

module.exports = {getRandomPort, getRandomBinary};