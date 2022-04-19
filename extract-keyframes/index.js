const debug = require('debug')('extract-keyframes');
const fs = require('fs');
const spawn = require(`child_process`).spawn;
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static');
const EventEmitter = require('events');
const uuid = require('uuid/v4');
const rimraf = require('rimraf');

const WORKING_DIRECTORY = process.env.WORKING_DIRECTORY || process.env.TEMP;
const FFPROBE_PATH = process.env.FFPROBEPATH || ffprobe.path;
const FFMPEG_PATH = process.env.FFMPEGPATH || ffmpeg.path;

function spawnProcess(binaryPath, args){
	debug(`\n\n`, binaryPath, args.join(` `), `\n\n`);
	return spawn(binaryPath, args);
}

function extractKeyframes(fileObject) {

	if(!fileObject){
		return Promise.reject(`No filepath or buffer passed as an argument. Pass a filepath (string) pointing to the video file, or a file object (buffer) of the video you'd like to process`);
	}


	const fsPromise = new Promise( (resolve, reject) => {

		if(Buffer.isBuffer(fileObject)){



		} else if(typeof(fileObject) === 'string' ) {

			fs.access(fileObject, function(err) {
				if (err) {
					reject('Unable to access file.', err)
				} else {
					resolve(fileObject);
				}
			});

		} else {
			reject('A valid file object or path was not passed to the function. The object passed was:', fileObject);
		}

	});

	return fsPromise
		.then(filePath => {

			return new Promise( (resolve, reject) => {

				debug(`INPUT FILEPATH:`, filePath);

				const emitter = new EventEmitter();

				resolve(emitter);

				setTimeout(function(){
	
					// FFProbe Options / Listeners
					const keyframeTimeIndexExtractionArguments = [
						`-loglevel`,
						`error`,
						`-select_streams`,
						`v:0`,
						`-show_entries`,
						`frame=pkt_pts_time,pict_type`,
						`-of`,
						`csv=print_section=0`,
						`${filePath}`
					];
	
					const keyframeTimeIndexExtraction = spawnProcess( FFPROBE_PATH, keyframeTimeIndexExtractionArguments );
	
					emitter.emit('start');
	
					keyframeTimeIndexExtraction.stdout.on(`data`, (data) => {
						data = data.toString(`utf8`);
	
						// We want to look for frames labelled with 'I'. These are the keyframes
						if(data.indexOf('I') > -1){
	
							data.split('\n').filter(z => {
									return z.indexOf('I') > 1;
								})
								.forEach(data => {
	
									const frameTime = data.split(',')[0];

									const details = {
										keyframeTimeoffset : Number(frameTime),
									};

									emitter.emit('keyframe', details);
																
	
								})
							;
	
						}
					});
	
					keyframeTimeIndexExtraction.stderr.on(`data`, (data) => {
						debug(`stderr: ${data}`);
					});
	
					keyframeTimeIndexExtraction.on(`close`, (code) => {
	
						if(code === 1){
							reject(`keyframeTimeIndexExtraction exited with status code 1 and was unhappy`);
						} else if(code === 0){
	
						}
	
					});

				}, 100);

			});
				

		})
	;

};

module.exports = extractKeyframes;