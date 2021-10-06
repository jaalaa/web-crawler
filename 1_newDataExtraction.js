// write file
const fs = require("fs");

// const
var config = require('./constant.js')

// analys
const client = require('cheerio-httpcli')

// Item key
const eichholtz_list_item_query = config.eichholtz_envConf.list_item_query;

// output file name
const result_name = config.date; // config.path + 'output\\date.txt';
const joblog = config.log; // config.path + 'output\\log.txt';
const log_name  = config.eichholtz_envConf.log_name;

//database
const nedb_promise = require('nedb-promise');

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

// get date
const data_today = yyyymmdd();

// analys page
function eichholtz_getListURL(_page) {

	if(_page == 0){
		return config.loginURL;
	} else if (_page == 1) {
		return config.collection;
	} else {
		return config.collectionMulti + _page;
	}
}

async function main(){

	// data collect
	client.fetch(
		// access
		eichholtz_getListURL(0)
	).then(function (result) {

		// access
		eichholtz_collectData()
	
	})
	.catch(function (err) {
		// error
		writelog("[" + yyyymmdd_hhmm() + "]" + "Error:" + err.message, true);
	})
	.finally(function () {
		// finish
		writelog("[" + yyyymmdd_hhmm() + "]" + "Finish", true);
	});
	
	writelog(data_today)
	
}

main();

async function eichholtz_collectData( ){

	let page = 1;
	let number_of_items = 0;
	let count_of_items = 0;
	let errorCount = 0;
	
	let page_number;
	let page_number_old;
	let newdata = [];

	console.log("============================================ start ================================================");

	do {
		
		try{
			let url = eichholtz_getListURL(page);
		
			let ret = client.fetchSync(url);
			
			if (ret.error || !ret.response || ret.response.statusCode !== 200) {
				if(ret.error){
					writelog("[" + yyyymmdd_hhmm() + "]" + "Error:" + ret.error ,true);
				}
				if(ret.response){
					writelog("[" + yyyymmdd_hhmm() + "]" + "Error:response=" + ret.response ,true);
				}
				if(ret.response.statusCode){			
					writelog("[" + yyyymmdd_hhmm() + "]" + "Error:statusCode=" + ret.response.statusCode ,true);
				}
				throw error;
			} else {
				let items = ret.$(eichholtz_list_item_query);
				
				page_number_old = page_number;
				page_number = ret.$('span.toolbar-number').text().trim();
	
				if( page_number != page_number_old ){
	
					number_of_items = items.length;

					console.log("page:" + page + "(" + number_of_items +")")
				
					for (let loop = 0; loop < items.length; loop++ ) {
		
						let _name = ret.$('a', items[loop]).text().trim();
						let _id = ret.$('div.product-sku-value', items[loop]).text().trim();
						let _url = ret.$('a.product-item-link', items[loop]).attr('href');

						// writelog(ret.body,true);

						// let _price = ret.$('span.special-price .price', items[loop]).text().trim().substr(1,);
						// let _price_old = ret.$('span.old-price .price', items[loop]).text().trim().substr(1,);
	
						let _date = data_today;
						// let _type = 'update';
		
						newdata.push({ 
							eichholtz_name: _name,
							eichholtz_id: _id,
							eichholtz_url: _url,
							date: _date ,
						});
		
					}
		
					count_of_items += number_of_items;
					page++;
	
				}else{
					number_of_items = 0;
				}
				
			}
	
		}catch(error){
			
			if( errorCount > 5){ break}
			else{
				setTimeout(() => { 
					writelog("[" + yyyymmdd_hhmm() + "]" + "Wait time 2s",true);
				}, 2000);
				errorCount++;
			}
		}
	} while ( number_of_items > 0 );
	// } while ( page < 1 );
	
	writelog("[" + yyyymmdd_hhmm() + "]" + "Read Count Item:" + count_of_items ,true);
	
	// let final_data = await eichholtz_updateDB(newdata , count_of_items);
	await eichholtz_updateDB(newdata , count_of_items);	

	await jobwritelog( __filename )

	console.log("============================================  end  ================================================");

};

/**
 * 
 * @param {*} _newdata 
 * @param {*} _count_of_items 
 */
async function eichholtz_updateDB( _newdata , _count_of_items) {

	// old data delete ( 1 month )
	await db.eichholtz.remove({date: { $lt :minuseyyyymmdd(1) }}, { multi: true });

	// today data deleter
	await db.eichholtz.remove({date: data_today}, { multi: true });

	for (let loop = 0; loop < _newdata.length; loop++) {

		let obj = _newdata[loop];
		await db.eichholtz.insert(obj);

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
