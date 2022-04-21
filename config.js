module.exports = {    
    checkKeyframes : false, 
    SaveLouderPoints: true,
    clear_temp_mp3s: false,

    mp3onePartDurationSec: 480,
    maxStdoutBuffer: 104857600, //1024 * 1024 * 100

    params: {
        silenceVolumeThreadhold: 0.2,
        silenceAtackSec: 0.1,
        silenceReleaseSec: 0.3,
        silenceDelaySec: 0.3,
        keyframeGlitchOffset: 1.5
    }
    /*
    smoother but longer:
    silenceVolumeThreadhold: 0.08,
    silenceReleaseSec: 1.5,
    silenceDelaySec: 1.5,
    keyframeGlitchOffset: 1.5
    
    */
}