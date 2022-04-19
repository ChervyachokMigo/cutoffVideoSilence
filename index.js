const { cutvideosilence, cutVideoByDuration }  = require('./cutvideosilence');

const params = {
    silenceVolumeThreadhold: 0.2,
    silenceReleaseSec: 0.5,
    silenceDelaySec: 0.5,
    keyframeGlitchOffset: 1.5
}
/*silenceVolumeThreadhold: 0.08,
silenceReleaseSec: 1.5,
silenceDelaySec: 1.5,
keyframeGlitchOffset: 1.5*/

//const folderPath = `F:\\!FileArchive\\talalauploads`;
const folderPath = `F:\\Downloads`;

const fileName = `Первая кровь! _ Worms W.M.D. _ CS -GO-S4hWtAZo7PM.mp4`;

//cutvideosilence(`${folderPath}\\Осу геймплей классический-v1457751437.mp4`);
//cutvideosilence(`${folderPath}\\Чил + учу карты-v1451079053.mp4`);
//cutvideosilence(`${folderPath}\\Экстрасенс-v1449986637.mp4`);
//cutvideosilence(`${folderPath}\\Смотрим SPEED CUP Болеем за наших!!!!-v1458729182_cutted.mp4`);
cutvideosilence(folderPath, fileName, params);
//cutVideoByDuration(`${folderPath}\\Смотрим SPEED CUP Болеем за наших!!!!-v1458729182.mp4`, 0, 480);