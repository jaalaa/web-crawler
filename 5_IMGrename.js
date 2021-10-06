// const
var config = require('./constant.js')

// write file
const fs = require("fs");
// get date
const data_today = yyyymmdd();

//log
const joblog = config.log; // config.path + 'output\\log.txt';

const downloadDir = config.downloadInfo.dir_name + readCSV().replace(/\-/g,'')  + "_IMG/";
const renameDir = config.downloadInfo.dir_name + readCSV().replace(/\-/g,'')  + "_IMG_rename/";

function renameFiles( _item, _i ){

    // download dir
    let filedir = downloadDir + _item + "/"
    let filedirrename = renameDir + _item + "/"

    if (!fs.existsSync(filedirrename)) {
        fs.mkdirSync(filedirrename)        
    }

    // file list
    var files = fs.readdirSync(filedir).sort();

    for(var i=0; i<files.length; i++){
        console.log(files[i] + ':' + i)

        if(i==0){
//            fs.renameSync(filedir + files[i], filedirrename + _item + ".jpg");
            fs.copyFileSync(filedir + files[i], filedirrename + _item + ".jpg");
        }else{
//            fs.renameSync(filedir + files[i], filedirrename + _item +"_" + i + ".jpg");
            fs.copyFileSync(filedir + files[i], filedirrename + _item +"_" + i + ".jpg");
        }

    }

    console.log("--------------------------")

}

function renameList(){

    let dataArray = []
    let filename = readCSV(1) + '_' + readCSV() + '_2_new.txt'
    // console.log(readCSV(1) + '_' + readCSV() + '_2_new.txt')

    if (fs.existsSync(config.downloadInfo.targetPath + filename )) {
        data = fs.readFileSync( config.downloadInfo.targetPath + filename , 'utf8')
        dataArray = data.split(/\r?\n/);
        
    }else{
        console.log("File did not exist")        
    }

    return dataArray
}

function writelog(text, indicate){
	try {
		fs.appendFileSync (result_name, text + "\n", function(err){
			if(err){
				throw err;
			}
		});
	}catch(e){
		console.log(e);
	}
}

/**
 * make time
 */
function yyyymmdd() {
	var x = new Date();
	var y = x.getFullYear().toString();
	var m = (x.getMonth() + 1).toString();
	var d = x.getDate().toString();
	(d.length == 1) && (d = '0' + d);
	(m.length == 1) && (m = '0' + m);
	var yyyymmdd = y + '-' + m + '-' + d;
	return yyyymmdd;
}

function main(){

//    let filedir = downloadDir
    let filedir = renameDir

    // 存在しない場合、作成
    if (! fs.existsSync( filedir )) {
        console.log("file doesn't exist")
        fs.mkdirSync(renameDir)

//    }else{

        var idList = renameList()

        console.log(idList.length)

        for(var i=0; i< idList.length; i++){
            if(idList[i]){
                renameFiles(idList[i],i)
            }
        }

        jobwritelog( __filename )
    }
}

function readCSV( _number ){

    let data = []

    if (fs.existsSync( config.date )) {
        data = fs.readFileSync( config.date , 'utf8')
       	dataArray = data.split(/\r?\n/);
    }else{
        console.log('cound not find the following file: ' + config.date)
    }
	
	if( _number ){
	    return dataArray[dataArray.length - 2 - _number]
	}else{
		return dataArray[dataArray.length - 2]
	}
}

main()

/**
 * 
 * @param {messege} text 
 * @param {flag of message} indicate 
 */

 function jobwritelog(text){
	
	try {
		fs.appendFileSync (joblog, text + "\n", function(err){
			if(err){
				throw err;
			}
		});
	}catch(e){
		console.log(e);
	}
}

