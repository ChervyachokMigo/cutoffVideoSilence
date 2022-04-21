const { cutvideosilence, cutVideoByDuration }  = require('./cutvideosilence');
const { params } = require('./config');

if (typeof process.argv[2] === 'undefined'){
    console.log('Nothing to do.');
} else {
    cutvideosilence(process.argv[2], params);
}