// const
var config = require('./constant.js')
// analys
const client = require('cheerio-httpcli')
// csv
const iconv = require('iconv-lite')
const csv  = require('csvtojson')
const path = require('path');
// Excel
const xlsx = require('xlsx-writestream');
// get date
const data_today = yyyymmdd();
const data_today_hhmm = yyyymmdd_hhmm();
// write file
const fs = require("fs");
// Item key
const eichholtz_list_item_query = config.eichholtz_envConf.list_item_query;

// output file name
const result_excel_compare = config.path + 'output\\' + data_today_hhmm +'_all.xlsx';
const log_name  = config.eichholtz_envConf.log_name;

//database
const nedb_promise = require('nedb-promise');
const nedb_file_name = config.eichholtz_envConf.nedb_file_name;
const nedb_file_name_tmp = config.eichholtz_envConf.nedb_file_name_tmp;
const targetDate = readCSV();

const db = {};
db.eichholtz = new nedb_promise({
	// filename: nedb_file_name,
	filename: 'list-items.nedb',
	autoload : true
});
db.tmp = new nedb_promise({
	// filename: nedb_file_name_tmp,
	filename: 'list-items.nedb',
	autoload : true
});

/**
 * 
 * @param {*} _newdata 
 * @param {*} _count_of_items 
 */
async function selectDB( _date ) {


	const results = await db.eichholtz.find({date:_date});

	await writeExcel(result_excel_compare, results)
	
}

selectDB(targetDate)

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

/**
 * make time
 */
function minuseyyyymmdd( countMonth ) {
	var x = new Date();
	var y = x.getFullYear().toString();
	var m = (x.getMonth() + 1 - countMonth ).toString();
	var d = x.getDate().toString();
	(d.length == 1) && (d = '0' + d);
	(m.length == 1) && (m = '0' + m);
	var yyyymmdd = y + '-' + m + '-' + d;
	return yyyymmdd;
}

/**
 * make time
 */
function yyyymmdd_hhmm() {
	var x = new Date();
	var y = x.getFullYear().toString();
	var m = (x.getMonth() + 1).toString();
	var d = x.getDate().toString();
	var hh = x.getHours().toString();
	var mm = x.getMinutes().toString();
	(d.length == 1) && (d = '0' + d);
	(m.length == 1) && (m = '0' + m);
	(hh.length == 1) && (hh = '0' + hh);
	(mm.length == 1) && (mm = '0' + mm);
	
	var yyyymmdd_hhmm = y + '_' + m + '_' + d + '_' + hh +'' + mm ; 

	return yyyymmdd_hhmm;
}

/**
 * 
 * @param {messege} text 
 * @param {flag of message} indicate 
 */

function writelog(text, indicate){
	file_name = result_name;
	
	try {
		if(indicate){
			file_name = log_name;
		}
		fs.appendFileSync (file_name, text + "\n", function(err){
			if(err){
				throw err;
			}
		});
	}catch(e){
		console.log(e);
	}
}

/**
 * 
 * @param {*} _eichholtz_data 
 * @param {*} _newdata 
 */
async function excelFile( _eichholtz_data, _newdata){

	// delete old file
	await db.tmp.remove({}, { multi: true });

	// insert eichholtz_data
	for (let loop = 0; loop < _eichholtz_data.length; loop++) {
		await db.tmp.insert(_eichholtz_data[loop]);
	}

	// insert _newdata
	for (let loop = 0; loop < _newdata.length; loop++) {

		let obj = _newdata[loop];
		let set = {}
		set.glarx_id = obj['独自商品コード']
		set.glarx_url = obj['商品ページURL']
		set.glarx_name = obj['商品名']
		set.glarx_price = obj['販売価格']

//		let doc = await db.tmp.findOne({ common_id: set.glarx_id.substring(0,6) });
		let doc = await db.tmp.findOne({ eichholtz_id: set.glarx_id });
		
		if( doc ){
//			await db.tmp.update({common_id: set.glarx_id.substring(0,6)}, {$set: set});
			await db.tmp.update({eichholtz_id: set.glarx_id }, {$set: set});
		} else {
//			set.common_id = set.glarx_id.substring(0,6);
			set.eichholtz_id = set.glarx_id ;
			await db.tmp.insert(set);
		}

	}

	let all_data = await db.tmp.find({})

	await delete all_data._id
	await writeExcel(result_excel_compare,all_data)
	
}
/**
 * 
 * @param {*} dir 
 * @param {*} data 
 */
function writeExcel(dir, data){
	xlsx.write( dir , data, function (err) {
		// Error handling here
		if(err) throw err;
	});
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
	