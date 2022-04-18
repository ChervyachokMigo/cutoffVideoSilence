const { exec, spawn } = require('child_process');

module.exports = exec_cmd = async function (cmd, args){
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
        exec(`${cmd} ${args.join(' ')}`, {maxBuffer: 1024 * 1024 * 100},(error, stdout) => {
          if (error) {
             reject(error);
             return;
         }
         resolve(stdout)
        });
    })
}