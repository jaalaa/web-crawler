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

function download(download_list, callback , errorback ){
    request.head(download_list.url, (err, res, body) => {
        if (  res.headers && ( res.headers['content-type'] === 'application/pdf' ||
              res.headers['content-type'] === 'image/jpeg' ) &&
              res.headers['content-length'] > 0 &&
              res.statusCode === 200) {
                request(download_list.url)
                .on( 'error', errorback)
                .pipe(
                    fs.createWriteStream(download_list.path)
                )
                .on('close', callback)
            } else {
//                writelog("Error:res.headers['content-type']=" + res.headers['content-type'] );
//                writelog("Error:res.headers['content-length']=" + res.headers['content-length']);
//                writelog("Error:statusCode=" + res.statusCode);
                errorback()
        }
    })
}


async function download_all_data(){

    let download_list = []

    let csvFile = await readCSV()
    let downloadItems = await readItemsInfo4DB(csvFile)

    for(const item of downloadItems){
        var errorback = function(){
            writelog(logformat('Item info get Error! ',null,item.eichholtz_id))
        }
        await download_one_item( item , download_list, errorback)
    }

    await downloadAllData(download_list)

}
async function downloadAllData(download_list){
    for(let i=0; i<download_list.length;i++){
        var pdfcnt = 1;
        var imgcnt = 1;
        
        // console.log(download_list[i])

        var errorback = async function(){
            download_list[i].result = 'Error'
            writelog(logformat('Download Err!', download_list[i]))
            console.log( logformat('Download Err!', download_list[i]))
        }
        var callback = async function(){
            download_list[i].result = 'OK'
            writelog(logformat('Download Done!', download_list[i]))
            console.log( logformat('Download Done!', download_list[i]))
        }
        if(download_list[i].type == 'img'){
//            await download(download_list[i] , callback, errorback);
            await setTimeout(download, Math.round( imgcnt/50 ) * config.downloadInfo.time * 1000, download_list[i], callback, errorback);
            imgcnt++;
        }else{
        	console.log(pdfcnt + ':' +download_list[i].url)
            await setTimeout(download, pdfcnt * config.downloadInfo.time * 1000, download_list[i], callback, errorback);
            pdfcnt++;
        }

    }
}
function download_one_item( _item, download_list , errorback ){

    let ret = client.fetchSync( _item.eichholtz_url );

	

    if (ret.error || !ret.response || ret.response.statusCode !== 200) {
        writelog(logformat("Error:",null, ret.error))
        writelog(logformat("Error:response=",null,ret.response))
        writelog(logformat("Error:statusCode=" ,null,ret.response.statusCode))
        writelog(logformat('Download Err!', null, _item.eichholtz_url))
        
        console.log('Download Err:' +_item.eichholtz_url)
        
//        writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:" + ret.error ,true);
//        writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:response=" + ret.response ,true);
//        writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:statusCode=" + ret.response.statusCode ,true);
        errorback()
    } else {
        let script_tag = ret.$('script').text();
//        getImgInfo(script_tag).then((img_data) =>{
//            checkDir( _item.eichholtz_id, function(){
//                getDownloadInfo(img_data, _item.eichholtz_id, download_list )
//            })     
//        })


          getDownloadInfo(null, _item.eichholtz_id, download_list )


    }
}

function logformat(messege, object_data, textdata){
    const element = []
    if(messege && messege.length > 0) element.push(messege)
    if(object_data && object_data.result.length > 0) element.push(object_data.result)
    if(object_data && object_data.id.length > 0) element.push(object_data.id)
    if(object_data && object_data.url.length > 0) element.push(object_data.url)
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

async function getDownloadInfo( _img_data , _itemsID, download_list){

    if( process.argv[4] == 'Y' ){
        // download dir
        let filedir = config.downloadInfo.dir_name + _itemsID + "/"

        for(let i=0; i<_img_data.length; i++){
            const img_url = _img_data[i].full

            // download file name
            // const img_file = filedir + config.downloadInfo.img_name + _itemsID + '_' + i + '.jpg'
        const fromURL = img_url.split('/')
        const img_file = filedir + fromURL[fromURL.length - 1]

            download_list.push({
                url: img_url,
                path: img_file,
                id: _itemsID,
                type: 'img'
            })
        }
    }

    
    if( process.argv[3] == 'Y' ){

        // download URL
        let url = config.downloadInfo.pdfDownloadURL + _itemsID + "/index.pdf"
        // let url = config.downloadInfo.pdfDownloadURL + _itemsID + "/"

        // download dir
//        let filedir1 = config.downloadInfo.dir_name + _itemsID + "\\"
        let filedir1 = config.downloadInfo.dir_name
        // download file name
        let pdf = filedir1 + config.downloadInfo.pdf_name + _itemsID + '.pdf'

        download_list.push({
            url: url,
            path: pdf,
            id: _itemsID,
            type: 'pdf'
        })
		
    }
    return download_list
}

function checkDir(_itemsID, callback){
//    let filedir = config.downloadInfo.dir_name + _itemsID + "\\"
    let filedir = config.downloadInfo.dir_name
    // check dir
    if (! fs.existsSync( filedir )) {
        fs.mkdirSync(filedir)
    }
    callback()
}

function readCSV(){

    let dataArray = []

    if (fs.existsSync(config.downloadInfo.itemList )) {
        data = fs.readFileSync( config.downloadInfo.itemList , 'utf8')
        dataArray = data.split(/\r?\n/);
        
    }else{
        console.log("File did not exist")        
    }

    return dataArray
}

async function readItemsInfo4DB( _dataArray ){

    let newItems = []

    if(process.argv[2] == "Y"){
        // get newItems
        newItems = await db.eichholtz.find({ type: 'new' },{ eichholtz_id : 1 , _id: 0 });

        if( newItems.length > 0 ){
            for( const item of newItems){
                _dataArray.push(item.eichholtz_id)
            }
        }
    }

    // 重複を削除
    var download_list = _dataArray.filter(function (x, i, self) {
        return self.indexOf(x) === i;
    });

    // get URL
    let downloadInfo = await db.eichholtz.find({eichholtz_id: { $in : download_list } },{ eichholtz_id : 1, eichholtz_url: 1 , _id: 0 });

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
    if( process.argv[2] === 'Y' || process.argv[2] === 'N'){

        if( process.argv[3] == 'Y' || process.argv[3] == 'N'){

            if( process.argv[4] == 'Y' || process.argv[4] == 'N'){
                
                if( process.argv[3] == 'Y' || process.argv[4] == 'Y'){
                    console.log("処理開始！")
                    await download_all_data()

                }else{
                    console.log("パラメータエラー:（ダウンロード対象ありません）" + process.argv[3] +","+ process.argv[4])
                }
            }else{
                console.log("パラメータエラー:（イメージダウンロード）" + process.argv[4])
            }        
        }else{
            console.log("パラメータエラー:（PDFダウンロード）" + process.argv[3])
        }        
    }else{
    
        console.log("パラメータエラー:" + process.argv[2])
    
    }
}

main()
