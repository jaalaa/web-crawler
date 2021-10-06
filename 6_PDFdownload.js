// const
var config = require('./constant.js')
// analys
const client = require('cheerio-httpcli')
// write file
const fs = require("fs");
const request = require('request')
//database
const nedb_promise = require('nedb-promise');
const nedb_file_name = config.eichholtz_envConf.nedb_file_name;
// get date
const data_today = yyyymmdd();

//log
const result_name = config.path + 'download\\downloadSummary_' + data_today +'.csv';

const db = {};
db.eichholtz = new nedb_promise({
	filename: nedb_file_name,
	autoload : true
});

const targetDate = readCSV();
const downloadDirPDF = config.downloadInfo.dir_name + targetDate.replace(/\-/g,'')  + "_PDF/";

function fileDownload(download_list, callback , errorback ){
    request.head(download_list.url, (err, res, body) => {

        if (  res && res.headers && res.headers['content-type'] === 'application/pdf' && 
              res.headers['content-length'] > 0 &&
              res.statusCode === 200) {
                request(download_list.url)
                .on( 'error', errorback)
                .pipe(
                    fs.createWriteStream(download_list.path)

                )
                .on('close', function(callback){
                    var stats = fs.statSync(download_list.path)
                    var fileSizeInBytes = stats.size;
                    // Convert the file size to megabytes (optional)
                    var fileSizeInKilobytes = fileSizeInBytes / 1024;

                    if( download_list.type == "pdf" && fileSizeInKilobytes < 400 ){
                        writelog(logformat("Download Error" ,null, download_list.path ))
                    }
                    console.log(download_list.path + " : " + fileSizeInKilobytes)
                    callback
                })
            } else {
                errorback()
        }
    })
}


async function download_all_data(){

    let download_list = []

    let csvFile = await readTargetID()
    let downloadItems = await readItemsInfo4DB(csvFile)

    for( let i=0; i<downloadItems.length;i++){
        var errorback = function(){
            writelog(logformat('Item info get Error! ',null,downloadItems[i].eichholtz_id))
        }

        // await download_one_item( item , download_list, errorback)
        await setTimeout(download_one_item, Math.round( i ) * config.downloadInfo.time * 1000, downloadItems[i], i, null, errorback);
    }

}

async function download_one_item( _item, _i,  errorback ){

    // checkDir( _item.eichholtz_id, function(){

        // console.log(_item.eichholtz_id)

        // pdf download
        let url = config.downloadInfo.pdfDownloadURL + _item.eichholtz_id + "/index.pdf"

        // download file name
        let pdf = downloadDirPDF + _item.eichholtz_id + '.pdf'

        var downloaderrorback = function(){
//                writelog(logformat('Download Err!', download_list[i]))
            console.log( logformat( _item.eichholtz_id + ': PDF Download Err!',null, url ))
        }
        var downloadcallback = function(){
//                writelog(logformat('Download Done!', download_list[i]))
            console.log( logformat(_item.eichholtz_id + ': PDF Download Done!',null, url))
        }
        
        fileDownload({
            url: url,
            path: pdf,
            id: _item.eichholtz_id,
            type: 'pdf'
        }, downloadcallback, downloaderrorback);    
    // })

}

function logformat(messege, object_data, textdata){
    const element = []
    if(messege && messege.length > 0) element.push(messege)
    if(object_data && object_data.result && object_data.result.length > 0) element.push(object_data.result)
    if(object_data && object_data.id && object_data.id.length > 0) element.push(object_data.id)
    if(object_data && object_data.url && object_data.url.length > 0) element.push(object_data.url)
    element.push(textdata)
    return element.join(',')
}

function readTargetID(){

    let dataArray = []
    let filename = readCSV(1) + '_' + targetDate + '_2_new.txt'
    // let filename = readCSV(1) + '_' + targetDate + '_2_new.txt'

    if(monthLast() < 6){
        filename = targetDate + '_1_all.txt'
    }else{
        filename = readCSV(1) + '_' + targetDate + '_2_new.txt'
    }

    console.log(filename)

    if (fs.existsSync(config.downloadInfo.targetPath + filename )) {
        data = fs.readFileSync( config.downloadInfo.targetPath + filename , 'utf8')
        dataArray = data.split(/\r?\n/);
        
    }else{
        console.log("File did not exist")        
    }

    return dataArray
}

async function readItemsInfo4DB( _dataArray ){

    // 重複を削除
    var download_list = _dataArray.filter(function (x, i, self) {
        return self.indexOf(x) === i;
    });

    // get URL
    let downloadInfo = await db.eichholtz.find( { $and:[ {eichholtz_id: { $in : download_list }}, {date: targetDate } ] } ,{ eichholtz_id : 1, eichholtz_url: 1 , _id: 0 });
    // console.log(downloadInfo)

    return downloadInfo

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

// async function filelist(){
//     fs.readdir(downloadDirPDF, function(err, files){
//         if (err) throw err;
//         var fileList = files.filter(function( file){
//             return fs.statSync(downloadDirPDF + file).isFile() && /.*\.pdf$/.test(downloadDirPDF + file); //絞り込み
//         })
//         console.log(fileList);
//     });
// }

function monthLast(){
    var lastdate = new Date();
    var target = targetDate.split('-');

    // 1ヶ月加えて翌月にします.
    lastdate.setMonth(target[1]);
    // 日付に0を設定し、該当月のの0日（つまり、前月末）にします.
    lastdate.setDate(0);

    // 結果確認.
    console.log(lastdate);  // 月末
    console.log(target);  // 月末

    let diff = lastdate.getDate() - target[2];
    console.log(diff)

    return diff
}

async function main(){
    console.log("処理開始！")
    let filedir = downloadDirPDF

    // 存在しない場合、作成
    if (! fs.existsSync( filedir )) {
        fs.mkdirSync(filedir)
    }

    // target download
    await download_all_data()

}



main()
