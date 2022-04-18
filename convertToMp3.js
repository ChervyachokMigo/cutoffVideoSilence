const path = require(`path`);
const fs = require(`fs`);
const exec_cmd = require(`./exec_cmd`);

module.exports = {
    
    convert: async function (source){
        var dirname = path.dirname(source);
        var basefilename = path.basename(source,path.extname(source));
        var outputfilename = `${dirname}\\${basefilename}.mp3`

        console.log(`extract audio started from ${source} to ${outputfilename}`);

        return await exec_cmd(`ffmpeg.exe`, [`-y`,`-i "${source}"`, `-b:a 158K`, `-vn`, `"${outputfilename}"`]);

    },

    deletefile: async function (file){
        fs.rm(file,()=>console.log(`[${getTime()}] delete audio ${file}`))
    },
}



function getTime(){
    let d = new Date(); 
    let d_hour = formatAddZero( d.getHours(), 2 );
    let d_min = formatAddZero( d.getMinutes(), 2 );
    let d_sec = formatAddZero( d.getSeconds(), 2 );
    return `${d_hour}:${d_min}:${d_sec}`;
}