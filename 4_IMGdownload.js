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

//log
const joblog = config.log; // config.path + 'output\\log.txt';

const db = {};
db.eichholtz = new nedb_promise({
	filename: nedb_file_name,
	autoload : true
});

const downloadDir = config.downloadInfo.dir_name + readCSV().replace(/\-/g,'')  + "_IMG/";

function fileDownload(download_list, callback , errorback ){
    request.head(download_list.url, (err, res, body) => {

        if (  res && res.headers && res.headers['content-type'] === 'image/jpeg' &&
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

                    console.log(download_list.path + " : " + fileSizeInKilobytes)
                    callback

                    return true
                })
            } else {
                errorback()
        }
    })
}


async function download_all_data(){

    let csvFile = await readTargetID()

    // 重複を削除
    var download_list = csvFile.filter(function (x, i, self) {
        return self.indexOf(x) === i;
    });
    
    console.log( 'ID  count:' + download_list.length)
    
    if(download_list.length > 0){
    
        for( let n=0; n< download_list.length; n++){
			if(download_list[n] != ""){
	            console.log(n + ':' + download_list[n])
	            downloadOneItemsIMGs(download_list[n] ,n)		
			}
        }
    }

}


async function downloadOneItemsIMGs(download_list,i){

    let downloadItems = await readItemsInfo4DB(download_list)

    if(downloadItems == '' ){
        console.log( 'No info url:' + download_list)

    }else{

        var errorback = function(){
            writelog(logformat('Item info get Error! ',null,downloadItems.eichholtz_id))
        }

        // setTimeout(await download_one_item, Math.round( i ) * config.downloadInfo.time * 5000, downloadItems[i], i, null, errorback);
    setTimeout(await download_one_item, Math.round( i ) * config.downloadInfo.time * 5000, downloadItems, i, null, errorback);
//        await download_one_item(downloadItems, null, errorback);
    }

}

async function download_one_item( _item, n, errorback ){

	console.log(_item.eichholtz_id)

    checkDir( _item.eichholtz_id, function(){

        // img download
        let ret = client.fetchSync( _item.eichholtz_url );

            // console.log(_item.eichholtz_url)

        if (ret.error || !ret.response || ret.response.statusCode !== 200) {
           
            console.log('Access Err:' +_item.eichholtz_url)
            
        } else {
            let script_tag = ret.$('script').text();

            getImgInfo(script_tag).then((img_data) => {

                // download dir
                let filedir = downloadDir + _item.eichholtz_id + "/"
                // let filedir = config.downloadInfo.dir_name + "/"

                // console.log(img_data)

                let download_list = []

                for(let i=0; i<img_data.length; i++){
                    const img_url = img_data[i].full

                // download file name
                const fromURL = img_url.split('/')
                const img_file = filedir + fromURL[fromURL.length - 1]

                    download_list.push({
                        url: img_url,
                        path: img_file,
                        id: _item.eichholtz_id,
                        type: 'img'
                    })

                    var downloaderrorback = async function(){
                        download_list[i].result = 'Error'
                        writelog(logformat('Download Err!', download_list[i]))
                        console.log( logformat('Download Err!', download_list[i]))
                    }
                    var downloadcallback = async function(){
                        download_list[i].result = 'OK'
                        writelog(logformat('Download Done!', download_list[i]))
                        console.log( logformat('Download Done!', download_list[i]))
                    }
        
                    console.log( n + '   :' + i+1 + ':' +download_list[i].url)
                    var resultDownload = fileDownload(download_list[i], downloadcallback, downloaderrorback);

                }
            })
        }    
    })
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


async function getImgInfo(_script){

    let script_array = _script.split('[data-gallery-role=gallery-placeholder]')
    let img_data = []

    for( let i=0; i<script_array.length;i++){
        if( script_array[i].indexOf('magnifierOpts') != -1){
            // pre cut
            let start_point = script_array[i].indexOf('{')
            let end_point = script_array[i].lastIndexOf('}')
            // get string info
            let result_string = script_array[i].substring(start_point, end_point)
            // change to json object
            let result_json = JSON.parse(result_string)
            // get img data
            img_data = result_json['mage/gallery/gallery'].data
        }
    }

    if( img_data.length > 0){
        return img_data
    }else{
        return -1
    }
}

function checkDir(_itemsID, callback){
   
    filedir = downloadDir + _itemsID + "\\"
    // check dir
    if (! fs.existsSync( filedir )) {
        fs.mkdirSync(filedir)
    }
    callback()
}

function readTargetID(){

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

async function readItemsInfo4DB( targetID ){
	
	let targetDate = readCSV()
	
    // get URL
//    let downloadInfo = await db.eichholtz.find({eichholtz_id: { $in : download_list } },{ eichholtz_id : 1, eichholtz_url: 1 , _id: 0 });
    let downloadInfo = await db.eichholtz.findOne( { $and :[ {eichholtz_id: targetID },{date: targetDate} ] },{ eichholtz_id : 1, eichholtz_url: 1 , _id: 0 });

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

async function main(){
    console.log("処理開始！")
    let filedir = downloadDir

    // 存在しない場合、作成
    if (! fs.existsSync( filedir )) {
        fs.mkdirSync(filedir)
    }
    await download_all_data()

    jobwritelog( __filename )
}

// function readFileName(){
//     let dir = './output/'

//     fs.readdir(dir, function(err, files){
//         if (err) throw err;
//         var fileList = files.filter(function(file){
//             return fs.statSync(dir + file).isFile() && /.*\.txt$/.test(dir + file); //絞り込み
//         })
//         console.log(fileList);
//     });    
// }

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

