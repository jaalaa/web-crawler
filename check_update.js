// const
var config = require('./constant.js')
// analys
const client = require('cheerio-httpcli')
client.set('iconv', 'iconv-lite');

// get date
const data_today_hhmm = yyyymmdd_hhmm();

// csv file name
const csvDownloadFileName = config.path + '/upload/' + data_today_hhmm + '_downloadCSV.csv';
const csvUploadFileName = config.path + '/upload/' + data_today_hhmm + '_uploadCSV.csv';

// Item key
const eichholtz_list_item_query = config.eichholtz_envConf.list_item_query;

//
const csv=require("csvtojson");
const iconv = require('iconv-lite')
const converter = require('json-2-csv');

// write file
const fs = require("fs");

// output file name
// const log_name  = config.eichholtz_envConf.log_name_update;
const log_name  = config.path + '/upload/' + data_today_hhmm + '_log.txt';

//database
const nedb_promise = require('nedb-promise');
const nedb_file_name_tmp = config.eichholtz_envConf.nedb_file_name_tmp;

const db = {};
db.tmp = new nedb_promise({
	filename: nedb_file_name_tmp,
	autoload : true
});

let type = " (Regular) ";
if( process.argv[2] == '2' ) type = " (Irregular) ";

// analys page
function corec_getListURL(_page) {

	if(_page == "login"){
		return 'https://corec.jp/login/';
	} else if (_page == "csv") {
		return 'https://corec.jp/s/order_form_products/csv/edit';
	}
}

// analys page
function eichholtz_getListURL(_page) {

	if(_page == "login"){
		return 'https://www.eichholtz.com/en/customer/account/login/';
	} else if (_page == "search") {
		return 'https://www.eichholtz.com/en/catalogsearch/result/?q=';
	} else if (_page == "outOfStock"){
		return 'https://www.eichholtz.com/en/eichholtz_catalog/ajax/atpinventory/?sku='
	} else if (_page == 1) {
		return 'https://www.eichholtz.com/en/collection.html';
	} else {
		return 'https://www.eichholtz.com/en/collection.html?p=' + _page;
	}
}

function login_corec(callback){

	try{
		writelog("[" + yyyymmdd_hhmm() + "]" + type +" corec access");

//		console.log("corec access")
		// https://corec.jp/login/ login
		let ret = client.fetchSync( corec_getListURL("login") )
		
		if (ret.error || !ret.response || ret.response.statusCode !== 200) {
			if(ret.error) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Corec Error:" + ret.error );
			if(ret.response && ret.response.headers) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Corec Error:response=" + ret.response.headers.status );
//			console.log("[" + yyyymmdd_hhmm() + "]"  +"corec Error:" + ret.error );
//			console.log("[" + yyyymmdd_hhmm() + "]"  +"corec Error:response=" + ret.response.headers.status );
			throw error;
		} else {
	
			// login
			var ret2 = ret.$('form[id=new_user]').submitSync({
				'user[email]': config.corec_user_info.username,
				'user[password]': config.corec_user_info.password,
			});
	
			writelog("[" + yyyymmdd_hhmm() + "]" + type +" corec login");
//			console.log("corec login")
	
			if (ret2.error || !ret2.response || ret2.response.statusCode !== 200) {
				if(ret2.error) writelog("[" + yyyymmdd_hhmm() + "]" + type +" corec login Error:" + ret2.error );
				if(ret2.response.headers) writelog("[" + yyyymmdd_hhmm() + "]" + type +" corec login Error:response=" + ret2.response.headers.status );
				// console.log("[" + yyyymmdd_hhmm() + "]"  +"corec login Error:" + ret2.error );
				// console.log("[" + yyyymmdd_hhmm() + "]"  +"corec login Error:response=" + ret2.response.headers.status );
				throw error;
			} else {
				
				writelog("[" + yyyymmdd_hhmm() + "]" + type +" csv file download");
				// console.log("csv file download")
				download().then((result) => {
					writelog("[" + yyyymmdd_hhmm() + "]" + type +" download OK!");
					writelog("[" + yyyymmdd_hhmm() + "]" + type +" download record count:" + result.length);
					// console.log('download OK!');
					// console.log(result.length)
					callback(result);
					// return 
				})
			}
		}
	}catch(err){
		writelog("[" + yyyymmdd_hhmm() + "]" + type +" corec access error");
		writelog(err)
		// console.log("corec error");
		callback([])
	}
}

async function login_eichholtz( _json_array){

	if( _json_array.length > 0){

		writelog("[" + yyyymmdd_hhmm() + "]" + type +" csv record:" + _json_array.length );
		// console.log("size:" + _json_array.length)

		try{
			// eichholtz login
			let ret = client.fetchSync( eichholtz_getListURL("login") )
			
			if (ret.error || !ret.response || ret.response.statusCode !== 200) {
				if(ret.error) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Eichholtz Access Error:" + ret.error );
				if(ret.response && ret.response.headers) writelog("[" + yyyymmdd_hhmm() + "]" + type +"Eichholtz Access Error:response=" + ret.response.headers.status );
				// console.log("[" + yyyymmdd_hhmm() + "]"  +"Eichholtz Access Error:" + ret.error );
				// console.log("[" + yyyymmdd_hhmm() + "]"  +"Eichholtz Access Error:response=" + ret.response.headers.status );
				throw error;
			} else {

				// login
				var ret2 = ret.$('form[id=login-form]').submitSync({
					'login[username]': config.user_info.username,
					'login[password]': config.user_info.password,
				});

				if (ret2.error || !ret2.response || ret2.response.statusCode !== 200) {
					if(ret2.error) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Eichholtz Login Error:" + ret2.error );
					if(ret.response && ret.response.headers) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Eichholtz Login Error:response=" + ret.response.headers.status );
					// console.log("[" + yyyymmdd_hhmm() + "]"  +"Eichholtz Login Error:" + ret2.error );
					// console.log("[" + yyyymmdd_hhmm() + "]"  +"Eichholtz Login Error:response=" + ret.response.headers.status );
					throw error;
				} else {

					if (! 'My Account' === ret2.$('div.page-title-wrapper').text()) {

						writelog("[" + yyyymmdd_hhmm() + "]" + "Error:fault login");
						writelog("[" + yyyymmdd_hhmm() + "]" + type +" Title:" + ret2.$('div.page-title-wrapper').text())

						// could not login
						// console.log("[" + yyyymmdd_hhmm() + "]" + "Warning:fault login");
						// Title
						// console.log(ret2.$('div.page-title-wrapper').text())
						throw error;
					}

					// // convert JSON array to CSV string
					
					
					// update json					
					updateCSV(_json_array, function(){
						converter.json2csv(_json_array, (err, csv) => {
							if (err) {
								writelog("[" + yyyymmdd_hhmm() + "]" + type +" csv record count:" + csv.length)
								writelog(err)
								// console.log("size:" + csv.length)
								throw err;
							}
	
							// Shift-jisで書き出しする場合
							fs.writeFileSync( csvUploadFileName , "" );              // 空のファイルを書き出す
							var fd       = fs.openSync( csvUploadFileName, "w");     // ファイルを「書き込み専用モード」で開く
							var buf      = iconv.encode( csv , "Shift_JIS" );  // 書き出すデータをShift_JISに変換して、バッファとして書き出す
							fs.write( fd , buf , 0 , buf.length , function(err, written, buffer){  //  バッファをファイルに書き込む
							if(err) {
								writelog("[" + yyyymmdd_hhmm() + "]" + type +" upload file create error")
								writelog(err)
								// console.log("file create")
								throw err
							};
								writelog("[" + yyyymmdd_hhmm() + "]" + type +" upload file created");
								// console.log("ファイルが正常に書き出しされました");
	
								upload_corec( csvUploadFileName )
	
							});
						})	
					});
				}
			}

		}catch(err){
			writelog("[" + yyyymmdd_hhmm() + "]" + type +" eichholtz access error");
			writelog(err);
			// console.log(err);
			// console.log("eichholtz error");
		}
	}else{
		writelog("[" + yyyymmdd_hhmm() + "]" + type +" csv file 0 record")
		// console.log("csv file 0")
	}
}

async function eichholtz_collectData( callback ){

	// delete old file
	await db.tmp.remove({}, { multi: true });

	let page = 1;
	let number_of_items = 0;
	let count_of_items = 0;
	
	let page_number;
	let page_number_old;

	do {

		try{

			let url = eichholtz_getListURL(page);
			let ret = client.fetchSync(url);
			
			if (ret.error || !ret.response || ret.response.statusCode !== 200) {
				if(ret.error) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Error:" + ret.error );
				if(ret.response && ret.response.headers) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Eichholtz Login Error:response=" + ret.response.headers.status );
				// console.log("[" + yyyymmdd_hhmm() + "]" + "Error:" + ret.error );
				// console.log("[" + yyyymmdd_hhmm() + "]" + type +" Eichholtz Login Error:response=" + ret.response.headers.status );
				throw err
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
						let _date = data_today_hhmm;
		
						await db.tmp.insert(
							{
								eichholtz_name: _name,
								eichholtz_id: _id,
								eichholtz_url: _url,
								date: _date
							}
						);
		
					}
		
					count_of_items += number_of_items;
					writelog("[" + yyyymmdd_hhmm() + "]" + type +" Eichholtz access page:"+ page)
					console.log("Eichholtz access page:"+ page)
					page++;
	
				}else{
					number_of_items = 0;
				}
			}
		}catch( err ){
			// if error occur, count error
			setTimeout(function () {
				writelog("[" + yyyymmdd_hhmm() + "]" + type +" Eichholtz access(error) wait 1s")
				// console.log("wait 1s")
			 }, 1000);
		}

	} while ( number_of_items > 0 );
	// } while ( page < 1 );
	
	writelog("[" + yyyymmdd_hhmm() + "]" + type +" Eichholtz Read Count Item:" + count_of_items);
	// writelog("[" + yyyymmdd_hhmm() + "]" + "Read Count Item:" + count_of_items);

	callback();
};

function updateCSV( _json_array, callback ){

	var updateArray = []
	writelog("[" + yyyymmdd_hhmm() + "]" + type +" csv update record count:" + _json_array.length);
	// console.log("updateCSV size:" + _json_array.length);

	eichholtz_collectData( async function(){

		for( var i in _json_array ){
			try{

				_obj = _json_array[i];

				// console.log("品番:" + _obj['品番'])

				let doc = await db.tmp.findOne({eichholtz_id: _obj['品番']});

				if( doc && doc.eichholtz_url !="" ){

					let detail = client.fetchSync( doc.eichholtz_url )

					if (detail.error || !detail.response || detail.response.statusCode !== 200) {
						if(detail.error) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Search Error:" + detail.error );
						if(detail.response && detail.response.headers) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Search Error:response=" + detail.response.headers.status );
						// console.log("[" + yyyymmdd_hhmm() + "]"  +"Search Error:" + detail.error );
						// console.log("[" + yyyymmdd_hhmm() + "]"  +	"Search Error:response=" + detail.response.headers.status );
						
						// 詳細ページにアクセスできない。
						// 旧データを保持する。
						// _obj['在庫確認'] = "search result 0(1)"
						updateArray.push(_obj)
						// 
						writelog("(" + i + "): " + _obj['品番'] + " search error")
						console.log("(" + i + "): " + _obj['品番'] + " search error")

					} else {
						// new data push
						updateArray.push(updateJSON( i, _obj, detail.body))
					}
				}else{

					let search = client.fetchSync( eichholtz_getListURL("search") + _obj['品番'] )
			
					if (search.error || !search.response || search.response.statusCode !== 200) {
						if(search.error) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Search Error:" + search.error );
						if(search.response && search.response.headers) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Search Error:response=" + search.response.headers.status );
						// console.log("[" + yyyymmdd_hhmm() + "]"  +"Search Error:" + search.error );
						// console.log("[" + yyyymmdd_hhmm() + "]"  +"Search Error:response=" + search.response.headers.status );
						
						// 検索できない。
						// 旧データを保持する。
						// _obj['在庫確認'] = "search result 0(2)"
						writelog("(" + i + "): " + _obj['品番'] + " no detail(1)")
						console.log("(" + i + "): " + _obj['品番'] + " no detail(1)")

						updateArray.push(_obj)
					} else {
						
						// search result count > 1
						if( search.$('a.product') && search.$('span.toolbar-number') && search.$('span.toolbar-number').text() >= 1 ){
							
							console.log(_obj['品番'])
							console.log(search.$('div.product-sku-value'))


							if( search.$('a.product').attr('href').length > 1 && search.$('div.product-sku-value') == _obj['品番'] ){
								// Detail URL
								writelog("(" + i + "): " + _obj['品番'] + " URL:" + search.$('a.product').attr('href'))
								console.log("(" + i + "): " + _obj['品番'] + " URL:" + search.$('a.product').attr('href'))
								// console.log(search.$('a.product').attr('href'))
								
								// Detail click
								let result_search = search.$('a.product').clickSync()
								// Detail check
								if (result_search.error || !result_search.response || result_search.response.statusCode !== 200) {
									if(result_search.error) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Detail page Error:" + result_search.error );
									if(result_search.response && result_search.response.headers) writelog("[" + yyyymmdd_hhmm() + "]" + type +" Detail page Error:response=" + result_search.response.headers.status );
									// console.log("[" + yyyymmdd_hhmm() + "]"  +"Detail page Error:" + result_search.error );
									// console.log("[" + yyyymmdd_hhmm() + "]"  +"Detail page Error:response=" + result_search.response.headers.status );

									// _obj['在庫確認'] = "no detail"
									// 詳細ページにアクセスできない。
									// 旧データを保持する。
									writelog("(" + i + "): " + _obj['品番'] + " no detail(2)")
									console.log("(" + i + "): " + _obj['品番'] + " no detail(2)")

									updateArray.push(_obj)
								} else {
									updateArray.push(updateJSON( i, _obj, result_search.body))
								}

							}else{
								writelog("(" + i + "): access url no link")
								writelog(search)

								console.log("(" + i + "): access url no link")
								console.log(search)

								// console.log("no link")
								// console.log(search)
								updateArray.push(_obj)
							}
						}else{
							// no item
							writelog("(" + i + "): " + _obj['品番'] + " : search no result :"+ search.$('span.toolbar-number').text()  )
							console.log("(" + i + "): " + _obj['品番'] + " : search no result :"+ search.$('span.toolbar-number').text()  )


							// console.log("search result 0")
							_obj['在庫確認'] = "OutofStock"
							updateArray.push(_obj)
						}
				
						// updateArray.push(obj)
					}
		
				}
			}catch(e){
				writelog(e.message)
				continue
			}
		}
		
		callback(updateArray);
	});
}

function updateJSON( _i, _obj, _detail){

	// inStock info analiz
	var result_array = _detail.split('availability')
	var result_array1 = result_array[1].split('"')
	result_array1 = result_array1[2].split('/')

	// outOfStock number get
	if( result_array1[result_array1.length - 1] == "OutOfStock"){

		var status = client.fetchSync( eichholtz_getListURL("outOfStock") + _obj['品番'] + '&quantity=1')
		
		var date
		try{
			date = changeDate(JSON.parse(status.body).atprows[0].date);
		}catch(err){
			writelog(err)
			writelog(status.body)
			console.log(err)
			console.log(status.body)
			// date = JSON.parse(status.body)
		}
		// analyz result
		writelog( "(" + _i + "): " + _obj['品番'] +" : "+ result_array1[result_array1.length - 1 ] + "(" + date + ")")
		console.log( "(" + _i + "): " + _obj['品番'] +" : "+ result_array1[result_array1.length - 1 ] + "(" + date + ")")
		
		// check result update(date)
		_obj['在庫確認'] = date

	}else{

		// analyz result
		writelog( "(" + _i + "): " + _obj['品番'] +" : "+ result_array1[result_array1.length - 1 ])
		console.log( "(" + _i + "): " + _obj['品番'] +" : "+ result_array1[result_array1.length - 1 ])

		// check result update(inStock)
		_obj['在庫確認'] = result_array1[result_array1.length - 1 ]

	}

	return _obj

}


function upload_corec(filename){

	try{

		// https://corec.jp/login/ login
		let ret = client.fetchSync( corec_getListURL("login") )
		if (ret.error || !ret.response || ret.response.statusCode !== 200) {
			if(ret.error) writelog("[" + yyyymmdd_hhmm() + "]" + type +" corec Error:" + ret.error );
			if(ret.response && ret.response.headers ) writelog("[" + yyyymmdd_hhmm() + "]" + type +" corec Error:response=" + ret.response.headers );
			// console.log("[" + yyyymmdd_hhmm() + "]"  +"corec Error:" + ret.error );
			// console.log("[" + yyyymmdd_hhmm() + "]"  +"corec Error:response=" + ret.response );
			throw error;
		} else {
			
//			console.log(ret.$('dt').text())
			
			if( !ret.$('dt').text().includes("ファシックソーイング株式会社") ){
//			if( ret.$('div.login-title').text().includes("ログイン") ){

				// login
				var ret2 = ret.$('form[id=new_user]').submitSync({
					'user[email]': config.corec_user_info.username,
					'user[password]': config.corec_user_info.password,
				});
	
				if (ret2.error || !ret2.response || ret2.response.statusCode !== 200) {
					if(ret2.error) writelog("[" + yyyymmdd_hhmm() + "]" + type +" corec login Error:" + ret2.error );
					if(ret2.response && ret2.response.headers ) writelog("[" + yyyymmdd_hhmm() + "]" + type +" corec login Error:response=" + ret2.response.headers );
					// console.log("[" + yyyymmdd_hhmm() + "]"  +"corec login Error:" + ret2.error );
					// console.log("[" + yyyymmdd_hhmm() + "]"  +"corec login Error:response=" + ret2.response );
					throw error;
				}
			}
				
			client.fetch(corec_getListURL('csv'), function (err, $, res, body) {
				if (err) {
					writelog(err);
					// console.error(err);
					return;
				}
				
				var result2 = $('form').submitSync({
					csv_file_name: filename,
					csv:filename
				});
	
				// 件数　と メッセージをチェック
				writelog("[" + yyyymmdd_hhmm() + "]" + type +" CSV Upload file count: " + result2.$('p.fo-greet').text())
				// console.log(result2.$('p.fo-greet').text())
	
				if( result2.$('span.fo-error').text().length == 0){
					var result3 = result2.$('form').submitSync();
					writelog("[" + yyyymmdd_hhmm() + "]" + type +" upload result: " + result3.$('div.co-title').text().trim());
					// console.log(result3.$('div.co-title').text());
				}else{
					writelog("upload result(error): " + result2.$('div.fo-error-list').text().trim())
					// console.log(result2.$('div.fo-error-list').text())
				}
			});
		}	
	}catch(error){

		writelog("[" + yyyymmdd_hhmm() + "]" + type + " csv upload error:" + error.message);

	}
}

function main( ){

	// csv download
	login_corec(
		(result) => login_eichholtz(result)
	)

}

main()

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

function writelog(text){

	try {
		fs.appendFileSync (log_name, text + "\n", function(err){
			if(err){
				throw err;
			}
		});
	}catch(e){
		console.log(e);
	}
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

function download(){
	return new Promise((resolve, reject) => {
		// ①ダウンロードマネージャーの設定(全ダウンロードイベントがここで処理される)
		client.download
		.on('ready', function (stream) {
			// 保存先ファイルのストリーム作成
			var write = fs.createWriteStream( csvDownloadFileName );
			write.on('finish', function () {
				writelog(stream.url.href + 'download csv file')
//				console.log(stream.url.href + 'をダウンロードしました');
			})
			.on('error', 
				console.error
			);

			// ダウンロードストリームからデータを読み込んでファイルストリームに書き込む
			stream.on('data', function (chunk) {
				write.write(chunk);
			})
			.on('end', function () {
				write.end();
			});
		})
		.on('error', function (err) {
			writelog(err.url + 'download error : ' + err.message)
//			console.error(err.url + 'をダウンロードできませんでした: ' + err.message);
		})
		.on('end', function () {
			convertCSV(csvDownloadFileName).then((results) => resolve(results));
		});

		let csvresult = client.fetchSync(corec_getListURL("csv")) 
			csvresult.$('span a.btn-icon').download();
	})
}

function changeDate( _date ){
	if( _date.length > 1){
		var date = _date.split(" ");
		var month =""
		if(date[1] == 'Jan') month = '01'; 
		if(date[1] == 'Feb') month = '02'; 
		if(date[1] == 'Mar') month = '03'; 
		if(date[1] == 'Apr') month = '04'; 
		if(date[1] == 'May') month = '05'; 
		if(date[1] == 'Jun') month = '06'; 
		if(date[1] == 'Jul') month = '07'; 
		if(date[1] == 'Aug') month = '08'; 
		if(date[1] == 'Sep') month = '09'; 
		if(date[1] == 'Oct') month = '10'; 
		if(date[1] == 'Nov') month = '11'; 
		if(date[1] == 'Dec') month = '12'; 

		if( date[0] == "" || month == "" || date[2] == "" ){
			return _date
		}else{
			return date[2] + '/' + month + '/' + date[0];
		}

	}else{
		return _date
	}
}
