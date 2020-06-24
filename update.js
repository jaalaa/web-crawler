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
const result_name = config.path + 'output\\result_' + data_today +'.txt';
const result_excel_name = config.path + 'output\\' + data_today_hhmm +'_1_summary.xlsx';
const result_excel_compare = config.path + 'output\\' + data_today_hhmm +'_2_compare.xlsx';
const result_excel_deleted = config.path + 'output\\' + data_today_hhmm +'_3_deleted.xlsx';
const log_name  = config.eichholtz_envConf.log_name;

//database
const nedb_promise = require('nedb-promise');
const nedb_file_name = config.eichholtz_envConf.nedb_file_name;
const nedb_file_name_tmp = config.eichholtz_envConf.nedb_file_name_tmp;

const db = {};
db.eichholtz = new nedb_promise({
	filename: nedb_file_name,
	autoload : true
});
db.tmp = new nedb_promise({
	filename: nedb_file_name_tmp,
	autoload : true
});


let type = " (Regular) ";
if( process.argv[2] == '2' ) type = " (Irregular) ";

// analys page
function eichholtz_getListURL(_page) {

	if(_page == 0){
		return 'https://www.eichholtz.com/en/customer/account/login/';
	} else if (_page == 1) {
		return 'https://www.eichholtz.com/en/collection.html';
	} else {
		return 'https://www.eichholtz.com/en/collection.html?p=' + _page;
	}
}

async function main(){

	// www.eichholtz.com login and data collect
	client.fetch(
		eichholtz_getListURL(0)
	).then(function (result) {
		// login
		writelog("[" + yyyymmdd_hhmm() + "]" + type +"Try to login", true);

		return result.$('form[id=login-form]').submit({
			'login[username]': config.user_info.username,
			'login[password]': config.user_info.password,
		});
	})
	.then(function (result) {
		// get title
		writelog("[" + yyyymmdd_hhmm() + "]" + type +"Page Title(" + result.$('div.page-title-wrapper').text() + ")", true);

		if (! 'My Account' === result.$('div.page-title-wrapper').text()) {
			// could not login
			writelog("[" + yyyymmdd_hhmm() + "]" + type +"Warning:fault login", true);
		}

	
		eichholtz_collectData().then((eichholtz_data) =>{
			// get the newst file
			getFilePath().then((dir_file) =>{
				// csv change json
				convertCSV(dir_file).then((results) => {
					// output data to excel file
					excelFile(eichholtz_data, results)
				})
			})
		})
	})
	.catch(function (err) {
		// error
		writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:" + err.message, true);
	})
	.finally(function () {
		// finish
		writelog("[" + yyyymmdd_hhmm() + "]" + type + "Finish", true);
	});
}

main();

async function eichholtz_collectData( ){

	let page = 1;
	let number_of_items = 0;
	let count_of_items = 0;
	
	let page_number;
	let page_number_old;
	let newdata = [];

	do {

		let url = eichholtz_getListURL(page);
		
		let ret = client.fetchSync(url);
		
		if (ret.error || !ret.response || ret.response.statusCode !== 200) {
			writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:" + ret.error ,true);
			writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:response=" + ret.response ,true);
			writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:statusCode=" + ret.response.statusCode ,true);
			throw error;
		} else {
			let items = ret.$(eichholtz_list_item_query);
			
			page_number_old = page_number;
			page_number = ret.$('span.toolbar-number').text().trim();

			if( page_number != page_number_old ){

				number_of_items = items.length;
			
				for (let loop = 0; loop < items.length; loop++ ) {
	
					let _name = ret.$('a', items[loop]).text().trim();
					let _id = ret.$('div.product-sku-value', items[loop]).text().trim();
					let _url = ret.$('a.product-item-link', items[loop]).attr('href');
					let _price = ret.$('span.special-price .price', items[loop]).text().trim().substr(1,);
					let _price_old = ret.$('span.old-price .price', items[loop]).text().trim().substr(1,);

					let _date = data_today_hhmm;
					let _type = 'update';
	
					newdata.push({ 
						common_id: _id.substring(0,6),
						eichholtz_name: _name,
						eichholtz_id: _id,
						eichholtz_url: _url,
						eichholtz_price: changePrice(_price), 
						eichholtz_price_old: changePrice(_price_old), 
						date: _date ,
						type :_type
					});
	
				}
	
				count_of_items += number_of_items;
				page++;

			}else{
				number_of_items = 0;
			}
			
		}
	} while ( number_of_items > 0 );
	// } while ( page < 5 );
	
	writelog("[" + yyyymmdd_hhmm() + "]" + type +"Read Count Item:" + count_of_items ,true);
	
	let final_data = await eichholtz_updateDB(newdata , count_of_items);

	return final_data

};

/**
 * 
 * @param {*} _newdata 
 * @param {*} _count_of_items 
 */
async function eichholtz_updateDB( _newdata , _count_of_items ) {

	let oldCount = 0;
	let addCount = 0;
	let addCount_dis = 0;
	let addCount_nodis = 0;
	let updateCount = 0;
	let updateCount_price = 0;
	let updateCount_dis = 0;
	let updateCount_nochange = 0;
	let deleteCount = 0;

	oldCount = await db.eichholtz.update({}, { $set: {type: 'delete'}},{ multi: true });

	for (let loop = 0; loop < _newdata.length; loop++) {

		let doc = await db.eichholtz.findOne({eichholtz_id: _newdata[loop].eichholtz_id});

		let obj = _newdata[loop];
		
		if( doc ){
			if( doc.date !== data_today_hhmm){
				updateCount++;
				await db.eichholtz.update({eichholtz_id: obj.eichholtz_id}, {$set: obj});
				let tmp1 = obj.price_old
				let tmp2 = obj.price_old
				if( obj.eichholtz_price_old !== '' ){
					// discount
					updateCount_dis++;
				}else if( doc.eichholtz_price !== '' && doc.eichholtz_price !== '' && doc.eichholtz_price !== obj.eichholtz_price ){
					// price changed
					updateCount_price++;
				}else{
					updateCount_nochange++;
				}
			}
		} else {
			// newitem
			obj.type = 'new';
			addCount++;

			await db.eichholtz.insert(obj);
			if( obj.eichholtz_price_old !== '' ){
				addCount_dis++;
			}else{
				addCount_nodis++;
			}
		}
	}

	let check_result = []
	let docs = await db.eichholtz.find({ type: 'delete' });

	if( docs.length === 0 ){
		check_result.push({result:"Nothing item which was deleted"});
	}else{
		for(let loop = 0; loop < docs.length; loop++ ){
			deleteCount++;
			await db.eichholtz.remove({eichholtz_id:docs[loop].eichholtz_id},{ multi: true });
			check_result.push(docs[loop]);
		}		
	}

	await writeExcel(result_excel_deleted, check_result)

	let statistic = {}
	let statistic_all =[]

	statistic.type 			= '割引あり';
	statistic.read 			= '-';
	statistic.beforeRead 	= '-';
	statistic.new 			= addCount_dis?addCount_dis:'0';
	statistic.update		= updateCount_dis?updateCount_dis:'0';
	statistic.deleted 		= '-';
	statistic_all.push(statistic)
	statistic = {}
	statistic.type 			= '割引なし';
	statistic.read 			= '-';
	statistic.beforeRead 	= '-';
	statistic.new 			= addCount_nodis?addCount_nodis:'0';
	statistic.update	 	= updateCount_price?updateCount_price:'0';
	statistic.deleted 		= '-';
	statistic_all.push(statistic)
	statistic = {}
	statistic.type 			= '前回と金額の変更ない';
	statistic.read 			= '-';
	statistic.beforeRead 	= '-';
	statistic.new 			= '-';
	statistic.update 		= updateCount_nochange?updateCount_nochange:'0';
	statistic.deleted 		= '-';
	statistic_all.push(statistic)
	statistic = {}
	statistic.type 			= '合計';
	statistic.read 	= _count_of_items?_count_of_items:'0';
	statistic.beforeRead 		= oldCount?oldCount:'0';
	statistic.new 			= addCount?addCount:'0';
	statistic.update		= updateCount?updateCount:'0';
	statistic.deleted 		= deleteCount?deleteCount:'0';
	statistic_all.push(statistic)

	await writeExcel( result_excel_name, statistic_all )

	writelog("[" + yyyymmdd_hhmm() + "]" + type　+ "Old Item Count:" + oldCount, true);
	writelog("[" + yyyymmdd_hhmm() + "]" + type　+ "New Item Count:" + addCount + "( Discount:" + addCount_dis + ", No Discount:" + addCount_nodis + ")", true);
	writelog("[" + yyyymmdd_hhmm() + "]" + type　+ "Update Item Count:" + updateCount + " ( Discount:" + updateCount_dis + ", Price changed:" + updateCount_price + ", No change:" + updateCount_nochange + ")", true);
	writelog("[" + yyyymmdd_hhmm() + "]" + type　+ "Delete Item Count:" + deleteCount, true);
	writelog("[" + yyyymmdd_hhmm() + "]" + type　+ "Web Item Count:" + _count_of_items, true);
	writelog("[" + yyyymmdd_hhmm() + "]" + type  + "Analyz End", true);

	let final_data = await db.eichholtz.find({ });

	return final_data
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
* Change the price
* 123.123.123,00 -> 123,123,123.00
* @param price
*/
function changePrice(_price){
	_price = _price.split('.')
	_price[_price.length - 1] = _price[_price.length - 1].replace(',','.')
	_price = _price.join('')

	return _price;
}

/**
 * @param path
 */
function convertCSV(path){
	return new Promise((resolve, reject) => {
	let datas  = []
	fs.createReadStream(path)
		.pipe(iconv.decodeStream('Shift_JIS'))
		.pipe(iconv.encodeStream('utf-8'))
		.pipe(csv().on('data', 
			data => datas.push(JSON.parse(data))
			))
		.on('end', () => resolve(datas))
	})
}
/**
 * the newest file name
 */
function getFilePath(){

	return new Promise((resolve, reject) => {
		let dirset = config.path + "\set";

		var getMostRecent = function (dir, cb) {
			var dir = path.resolve(dir);
			var files = fs.readdir(dir, function (err, files) {
				var sorted = files.map(function(v) {
					var filepath = path.resolve(dir, v);
					return {
						name:v,
						time:fs.statSync(filepath).mtime.getTime()
					}; 
				})
				.sort(function(a, b) { return b.time - a.time; })
				.map(function(v) { return v.name; });
		
				if (sorted.length > 0) {
					cb(null, sorted[0]);
				} else {
					cb('nothing file');
				}
			})
		}
		
		getMostRecent(dirset, function (err, file_name) {
			if (err){
				throw err;
			}
			resolve(dirset + "\\" +file_name) 
		});
	})
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

		let doc = await db.tmp.findOne({ common_id: set.glarx_id.substring(0,6) });
		
		if( doc ){
			await db.tmp.update({common_id: set.glarx_id.substring(0,6)}, {$set: set});
		} else {
			set.common_id = set.glarx_id.substring(0,6);
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
	