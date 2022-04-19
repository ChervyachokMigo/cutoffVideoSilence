const fs = require('fs');
const path = require(`path`);
const decode = require('audio-decode');
var ffmpeg = require('fluent-ffmpeg');
const { getVideoDurationInSeconds } = require('get-video-duration');
const Lame = require("node-lame").Lame;
const extractKeyframes = require('extract-keyframes');

const config = require(`./config`);

const {getTime, formatAddZero, deletefile, exec_cmd} = require(`./tools`)

module.exports = {
    cutvideosilence: async function (folderPath, filePath, params){ 
        if (typeof params.silenceVolumeThreadhold === 'undefined' || 
            typeof params.silenceReleaseSec === 'undefined' || 
            typeof params.silenceDelaySec === 'undefined' ||
            typeof params.keyframeGlitchOffset === 'undefined' )
        {
            console.log (`parameters not setuped.`)
            return false
        }

        var inputFile = `${folderPath}\\${filePath}`;  
        var cutfile_mp3 = await splitToMp3(inputFile);

        if (config.SaveLouderPoints){
            await getAndSaveLouderPoints(inputFile, cutfile_mp3, params);
        }

        await joinvideo(inputFile, params);
        
        console.log(`[${getTime()}] task complete`);
    },

    cutVideoByDuration: async function(inputFile, startTime, durationTime){
        var dirname = path.dirname(inputFile);
        var basefilename = path.basename(inputFile,path.extname(inputFile));
        var outputFile = `${dirname}\\${basefilename}_cutted.mp4`;
        if (!isExists(outputFile)) {
            console.log(`[${getTime()}] - start cuting ${inputFile} to ${outputFile}`);
            var ffmpeg_args = [
                `-loglevel quiet`, 
                `-y`, 
                `-i "${inputFile}"`, 
                `-ss ${startTime}`, 
                `-t ${durationTime}`, 
                `-vcodec copy`, 
                `-acodec copy`, 
                `"${outputFile}"`
            ];
            await exec_cmd(`ffmpeg.exe`, ffmpeg_args);
        } else {
            console.log(`[${getTime()}] skipping existing ${outputFile} file`);
        }
        console.log(`[${getTime()}] cuting video ${inputFile} ended`);
    }
}

async function getKeyframes(inputFile){
    var keyframes = [];
    var durationVideoSec = await getDuration(inputFile);   

    var firstkeyframe = await new Promise((resolve, reject)=> {
        extractKeyframes(inputFile)
        .then(extractionProcess => {

            // Event fired when extraction process has begun.
            extractionProcess.on('start', function(){
                console.log(`[${getTime()}] reading all keyframes of ${inputFile}`);
            }, false);

            // Event fired when a keyframe is extracted
            extractionProcess.on('keyframe', function(data){
                //keyframes.push(Object.values(data)[0]);
                resolve(Object.values(data)[0]);
                extractionProcess.emit('close');
            });

        })
        .catch(err => {
            console.log('[${getTime()}] Error extracting keyframes:', err);
            reject(err);
        });
    });

    firstkeyframe = firstkeyframe % 2;

    for (var i = firstkeyframe; i < durationVideoSec; i = i + 2){
        keyframes.push(i)
    }

    console.log(`[${getTime()}] finish counting keyframes. Total keyframes: ${keyframes.length}`);

    return keyframes;

}

async function getAndSaveLouderPoints(inputFile, cutfile_mp3, params){
    const audioFreq = await getAudioParameter(inputFile, `freq`);

    var dirname = path.dirname(inputFile);
    var basefilename = path.basename(inputFile,path.extname(inputFile));

    var concatfilename = `${dirname}\\${basefilename}_concat.txt`;

    await deletefile(concatfilename);

    var durationVideoSec = await getDuration(inputFile);   

    var keyframes = await getKeyframes(inputFile);
    console.log(keyframes);
    console.log(`[${getTime()}] start finding louder points and save of ${cutfile_mp3.length} files:`);
    var inoutpoints = [];
    for(var idx in cutfile_mp3){
        let timeOffset = Number(idx) * config.mp3onePartDurationSec;

        console.log(`[${getTime()}] start processing ${Number(idx) + 1} of ${cutfile_mp3.length} part`);

        //найти буффер в mp3 и считать громкость, записывая громкие отрывки в блокнот
        const decoder = new Lame({
            output: "buffer",
        }).setFile(cutfile_mp3[idx]);
    
        console.log(`[${getTime()}] get buffer ${cutfile_mp3[idx]}`);
        const gettedbuffer = await decoder
            .decode()
            .then(() => {
                return decoder.getBuffer();
            })
            .catch((error) => {
                console.log(error)
                return false
            });
        
        let timeList = [];
        let alldata = [];

        console.log(`[${getTime()}] get volume louder points >${params.silenceVolumeThreadhold} from buffer`);
        await decode(gettedbuffer, (err, audioBuffer) => {
            alldata = audioBuffer._channelData[0];
            console.log(`[${getTime()}] checking ${alldata.length} frames`);
            for (var buffval in audioBuffer._channelData[0]){
                let val = audioBuffer._channelData[0][buffval];
                
                if(val>=params.silenceVolumeThreadhold){
                    timeList.push({bufferoffset: buffval, time:buffval/audioFreq + timeOffset});
                }
            }
        });

        console.log(`[${getTime()}] filtering volume louder points ${timeList.length} points`);
        timeList = timeList.filter((val,idx,arr)=>{
            if (idx>0){
                if (arr[idx-1].time + params.silenceReleaseSec <= val.time){
                    return val
                }
            } else {
                return val
            }
        });
        
        console.log(`[${getTime()}] check keyframes of ${timeList.length} points`);
        
        timeList = timeList.filter((val,idx,arr)=>{
            if (config.checkKeyframes){
                /*var mod2 = ( (val.time*10) % (keyframe * 10) ) / 10;
                val.time -= mod2;*/
                keyframes.find((kfval, kfidx, kfarr)=>{
                    new Promise(()=> {
                        if(val.time >= kfval && (typeof kfarr[kfidx+1] === 'undefined' || val.time < kfarr[kfidx+1])){
                            val.time = kfval-params.keyframeGlitchOffset;
                        }
                    });
                });
            }

            if (val.time <0) {
                val.time = 0;
            }

            return val
        });
        

    
        const stopTimeLong = params.silenceReleaseSec * audioFreq;
        
        console.log(`[${getTime()}] getting longs of ${timeList.length} points`);
        let inoutpoints_current = [];
        for (let list_idx in timeList){
            var stopInc = stopTimeLong
            for (var stopTime = timeList[list_idx].bufferoffset; stopInc > 0; stopTime++){
                
                if (stopTime>alldata.length) break
            
                if (alldata[stopTime] <= params.silenceVolumeThreadhold) {
                    stopInc--;
                } else {
                    stopInc = stopTimeLong;
                }
                
            }
            timeList[list_idx].longTime = stopTime/audioFreq + timeOffset;
            timeList[list_idx].longTime -= (params.silenceReleaseSec-params.silenceDelaySec);
            if (timeList[list_idx].longTime > durationVideoSec){
                timeList[list_idx].longTime = durationVideoSec;
            }

            inoutpoints_current.push ({inpoint: Math.trunc(timeList[list_idx].time*10)/10, outpoint: Math.trunc(timeList[list_idx].longTime*10)/10});
        }

        console.log(`[${getTime()}] filtering ${inoutpoints_current.length} points`);
        inoutpoints_current = await concat_nearpoints(inoutpoints_current);

        console.log(`[${getTime()}] unique ${inoutpoints_current.length} points`);
        inoutpoints_current = inoutpoints_current.filter(onlyUnique);
        
        console.log(`[${getTime()}] add ${inoutpoints_current.length} points to general pointlist`);
        inoutpoints = inoutpoints.concat(inoutpoints_current);

        console.log(`[${getTime()}] ${Number(idx) + 1} of ${cutfile_mp3.length} part complete`);

        //удалить mp3
        if(config.clear_temp_mp3s){
            await deletefile(cutfile_mp3[idx]);
        }
    }

    console.log(`[${getTime()}] filtering ${inoutpoints.length} points`);
    inoutpoints = await concat_nearpoints(inoutpoints);

    console.log(`[${getTime()}] unique ${inoutpoints.length} points`);
    inoutpoints = inoutpoints.filter(onlyUnique);

    console.log(`[${getTime()}] save ${inoutpoints.length} points to ${concatfilename}`);
    for(let iopoint_idx in inoutpoints){
        fs.appendFileSync(
            concatfilename, 
            `file '${inputFile}'\ninpoint ${inoutpoints[iopoint_idx].inpoint}\noutpoint ${inoutpoints[iopoint_idx].outpoint}\n`,
            {encode:`utf-8`});
    }
    console.log(`[${getTime()}] saving all louder points complete`);
} 

async function splitToMp3(input){
    var dirname = path.dirname(input);
    var basefilename = path.basename(input,path.extname(input));

    var durationVideoSec = await getDuration(input);   

    var countfiles = Math.ceil(durationVideoSec/config.mp3onePartDurationSec);
    
    var inputfiles = [];
    console.log(`[${getTime()}] split file ${input} to ${countfiles} files:`);
    for (var countfile = 1; countfile <= countfiles; countfile++){
        let splitedFilename = `${dirname}\\${basefilename}_${formatAddZero(countfile,3)}.mp3`;
        let startpoint = (countfile-1)*config.mp3onePartDurationSec;
        if (!isExists(splitedFilename)) {
            console.log(`[${getTime()}] - start spliting ${countfile}/${countfiles} file to ${splitedFilename}`);
            var ffmpeg_args = [
                `-loglevel quiet`, 
                `-y`, 
                `-i "${input}"`, 
                `-ss ${startpoint}`, 
                `-t ${config.mp3onePartDurationSec}`, 
                `-vn`, 
                `"${splitedFilename}"`
            ];
            await exec_cmd(`ffmpeg.exe`, ffmpeg_args);
        } else {
            console.log(`[${getTime()}] - skipping existing ${splitedFilename} ${countfile}/${countfiles} file`);
        }
        inputfiles.push(splitedFilename);
    }
    return inputfiles
}

async function joinvideo(inputFile, params){
    var dirname = path.dirname(inputFile);
    var basefilename = path.basename(inputFile,path.extname(inputFile));
    var paramsText = `${params.silenceVolumeThreadhold}-${params.silenceReleaseSec}-${params.silenceDelaySec}-${params.keyframeGlitchOffset}`;
    var outputFile = `${dirname}\\${basefilename}_unsilenced_${paramsText}.mp4`;
    var concatfilename = `${dirname}\\${basefilename}_concat.txt`;
    console.log(`[${getTime()}] concat all parts to ${outputFile}`);
    var ffmpeg_args = [
        `-loglevel quiet`, 
        `-y`,
        `-f concat`, 
        `-safe 0`, 
        `-i "${concatfilename}"`, 
        `-vcodec copy`, 
        `-acodec copy`, 
        `"${outputFile}"`
    ];
    return await exec_cmd(`ffmpeg.exe`, ffmpeg_args);
}

async function concat_nearpoints(inoutpoints){
    let inoutpoints_filtred = [];
    for (let i = 0; i<inoutpoints.length;i++){
        if ( i < 0 ) i = 0;        
        if (i !== (inoutpoints.length-1) && inoutpoints[i].outpoint >= inoutpoints[i+1].inpoint){
            inoutpoints[i].outpoint = inoutpoints[i+1].outpoint;
            inoutpoints.splice( i+1, 1 );
            inoutpoints_filtred.push(inoutpoints[i]);
            i--;
        } else {
            inoutpoints_filtred.push(inoutpoints[i]);
        }
    }
    return inoutpoints_filtred;
}

async function getAudioParameter(input, parameterName){
    return await new Promise((resolve, reject)=> {
        ffmpeg.ffprobe(input, function(err, metadata) {
            if (err) {
                reject(err);
                return;
            }
            metadata.streams.forEach(function(stream){
                if (stream.codec_type === `audio`){
                    if (parameterName === `freq`){
                        resolve(stream.sample_rate)
                    }
                    if (parameterName === `bitrate`){
                        resolve(stream.bit_rate)
                    }
                }
            });
        });
    });
}

function isExists(file){
    try {
        if (fs.existsSync(file)) {
          return true
        } else {
            return false
        }
      } catch(err) {
            return false
      }
}

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}


async function getDuration(source){
    return await getVideoDurationInSeconds(source).then((duration) => {
        //console.log(`[${getTime()}] ${source} duration: `,duration,`secs`);
        return duration;
    });
}

