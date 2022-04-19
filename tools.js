const { exec } = require('child_process');
const { rm } = require('fs');
const { maxStdoutBuffer } = require('./config');

async function exec_cmd (cmd, args){
    return await new Promise((resolve, reject)=> {
        /*var child = spawn(cmd, args);
        child.stdout.on('data', async function (data) {
            console.log(data);
        });

        child.stderr.on('data', async function (data) {
            reject(data);
        });
        child.on('close', async function (code) {
            resolve(`complete, code: ${code}`);
        });*/
        exec(`${cmd} ${args.join(' ')}`, {maxBuffer: maxStdoutBuffer}, (error) => { //stdout switched off
          if (error) {
             reject(error);
             return;
         }
         resolve(`${cmd} complete`);
        });
    })
}

function formatAddZero(t, symbols = 1){
    var numberZeroed = t.toString();
    var numberLength = t.toString().length;
    if ( numberZeroed.length < symbols){
        for (var i = 0; i < symbols-numberLength; i++){
            numberZeroed = `0${numberZeroed}`;
        }
    }
    return numberZeroed;
}
function getTime(){
    let d = new Date(); 
    let d_hour = formatAddZero( d.getHours(), 2 );
    let d_min = formatAddZero( d.getMinutes(), 2 );
    let d_sec = formatAddZero( d.getSeconds(), 2 );
    return `${d_hour}:${d_min}:${d_sec}`;
}

async function deletefile (file){
    try{
        rm( file, ()=> 
            console.log(`[${getTime()}] delete ${file}`)
        );
    } catch (e) { }
}

module.exports = {
    getTime: getTime,
    formatAddZero: formatAddZero,
    deletefile: deletefile,
    exec_cmd: exec_cmd
}