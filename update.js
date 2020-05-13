var config = require('./constant.js')

const client = require('cheerio-httpcli')

// get date
const data_today = yyyymmdd();
const data_today_hhmm = yyyymmdd_hhmm();

// Item key
const list_item_query = config.envConf.list_item_query;

// write file
const fs = require("fs");
const result_name = config.path + 'output\\result_' + data_today +'.txt';

const log_name  = config.envConf.log_name;

//database
// const Database = require('nedb');
const nedb_promise = require('nedb-promise');
const nedb_file_name = config.envConf.nedb_file_name;

//const db = {};
const db = new nedb_promise({
	filename: nedb_file_name,
	autoload : true
});

let type = " (Regular) ";
if( process.argv[2] == '2' ) type = " (Irregular) ";

// analys page
function getListURL(_page) {

	if(_page == 0){
		return 'https://www.eichholtz.com/en/customer/account/login/';
	} else if (_page == 1) {
		return 'https://www.eichholtz.com/en/collection.html';
	} else {
		return 'https://www.eichholtz.com/en/collection.html?p=' + _page;
	}
}

async function login(){
	client.fetch(getListURL(0))
	.then(function (result) {

		// console.info('');
		writelog("[" + yyyymmdd_hhmm() + "]" + type +"Try to login", true);
		writelog("------------------------------------------------------------------------------------");
		writelog("[" + yyyymmdd() + "]" + type +"Analyz Start");

		return result.$('form[id=login-form]').submit({
			'login[username]': config.user_info.username,
			'login[password]': config.user_info.password,
		});
	})
	.then(function (result) {
		//	console.info(result.$('div.page-title-wrapper').text());
		writelog("[" + yyyymmdd_hhmm() + "]" + type +"Page Title(" + result.$('div.page-title-wrapper').text() + ")", true);

		if (! 'My Account' === result.$('div.page-title-wrapper').text()) {
			//	throw new Error('login failed');
			//	console.info('fault login');
			writelog("[" + yyyymmdd_hhmm() + "]" + type +"Warning:fault login", true);
		}

		collectData( )
		
	})
	.catch(function (err) {
	//	console.error('error', err.message);
		writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:" + err.message, true);
	})
	.finally(function () {
	//	console.info('finish');
		writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:" + err.message, true);
	});

}

login();

function collectData( ){

	let page = 1;
	let number_of_items = 0;
	let count_of_items = 0;
	
	let page_number;
	let page_number_old;
	let newdata = [];

	do {

		console.log(' page = ' + page);

		let url = getListURL(page);
		
		let ret = client.fetchSync(url);
		
		if (ret.error || !ret.response || ret.response.statusCode !== 200) {
			writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:" + ret.error ,true);
			writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:response=" + ret.response ,true);
			writelog("[" + yyyymmdd_hhmm() + "]" + type +"Error:statusCode=" + ret.response.statusCode ,true);
			//	console.log('ERROR:' + url);
			throw error;
		} else {
			let items = ret.$(list_item_query);
			
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
	
					newdata.push({ name: _name, id: _id, url: _url, price: _price, price_old: _price_old, date: _date , type :_type});
	
				}
	
				count_of_items += number_of_items;
				page++;

			}else{
				number_of_items = 0;
			}

			console.log('number_of_items = ' + number_of_items);
			
		}
	} while ( number_of_items > 0 );
	
	console.log('All items count = ' + count_of_items);
	
	writelog("[" + yyyymmdd_hhmm() + "]" + type +"Read Count Item:" + count_of_items ,true);
	
	updateDB(newdata , count_of_items);
	
};

async function updateDB( _newdata , _count_of_items ) {

	let oldCount = 0;
	let addCount = 0;
	let addCount_dis = 0;
	let addCount_nodis = 0;
	let updateCount = 0;
	let updateCount_price = 0;
	let updateCount_dis = 0;
	let updateCount_nochange = 0;
	let deleteCount = 0;

	oldCount = await db.update({}, { $set: {type: 'delete'}},{ multi: true });

	for (let loop = 0; loop < _newdata.length; loop++) {

		let doc = await db.findOne({id: _newdata[loop].id});

		let obj = _newdata[loop];
		
		if( doc ){
			if( doc.date !== data_today_hhmm){
				updateCount++;
				await db.update({id: obj.id}, {$set: obj});
				if( obj.price_old !== '' ){
					// discount
					writelog('Discount has Item  ( id:"' + obj.id + '", price:"' + obj.price + '", original price:"' + obj.price_old + '" )');
					updateCount_dis++;
				}else if( doc.price !== '' && doc.price !== '' && doc.price !== obj.price ){
					// price changed
					writelog('Price changed Item ( id:"' + obj.id + '", price:"' + obj.price + '", ( old price:"' + doc.price + '") )');
					updateCount_price++;
				}else{
					updateCount_nochange++;
				}
			}
		} else {
			// newitem
			obj.type = 'add';
			addCount++;
			await db.insert(obj);
			if( obj.price_old !== '' ){
				writelog('New Item Discount  ( id:"' + obj.id + '", name"' + obj.name + '", price:"' + obj.price + '", original price:"' + obj.price_old + '", url:"' + obj.url + '")' );
				addCount_dis++;
			}else{
				writelog('New Item           ( id:"' + obj.id + '", name:"' + obj.name + '", price:"' + obj.price + '", url:"' + obj.url + '")' );
				addCount_nodis++;
			}
		}
	}

	let docs = await db.find({ type: 'delete' });

	if( docs.length === 0 ){
		writelog('Nothing item which was deleted ');
	}else{
		for(let loop = 0; loop < docs.length; loop++ ){
			deleteCount++;
			await db.remove({id:docs[loop].id},{ multi: true });
			writelog('Deleted Item       ( id:"' + docs[loop].id + '", date:"' + docs[loop].date +'")');
		}		
	}

	writelog("[" + yyyymmdd_hhmm() + "]" + " Old Item Count:" + oldCount, true);
	writelog("[" + yyyymmdd_hhmm() + "]" + " New Item Count:" + addCount + "( Discount:" + addCount_dis + ", No Discount:" + addCount_nodis + ")", true);
	writelog("[" + yyyymmdd_hhmm() + "]" + " Update Item Count:" + updateCount + " ( Discount:" + updateCount_dis + ", Price changed:" + updateCount_price + ", No change:" + updateCount_nochange + ")", true);
	writelog("[" + yyyymmdd_hhmm() + "]" + " Delete Item Count:" + deleteCount, true);
	writelog("[" + yyyymmdd_hhmm() + "]" + " Web Item Count:" + _count_of_items, true);

	writelog("[" + yyyymmdd() + "]" + " Old Item Count   :" + oldCount);
	writelog("[" + yyyymmdd() + "]" + " New Item Count   :" + addCount + " ( Discount:" + addCount_dis + ", No Discount:" + addCount_nodis + " )");
	writelog("[" + yyyymmdd() + "]" + " Update Item Count:" + updateCount + " ( Discount:" + updateCount_dis + ", Price changed:" + updateCount_price + ", No change:" + updateCount_nochange + " )");
	writelog("[" + yyyymmdd() + "]" + " Delete Item Count:" + deleteCount);
	writelog("[" + yyyymmdd() + "]" + " Web Item Count   :" + _count_of_items);

	writelog("[" + yyyymmdd() + "]" + type +"Analyz End");
	writelog("[" + yyyymmdd_hhmm() + "]" + type +"Analyz End", true);
	writelog("------------------------------------------------------------------------------------");

}

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

function yyyymmdd_hhmm() {
	var x = new Date();
	var y = x.getFullYear().toString();
	var m = (x.getMonth() + 1).toString();
	var d = x.getDate().toString();
	(d.length == 1) && (d = '0' + d);
	(m.length == 1) && (m = '0' + m);
	var yyyymmdd_hhmm = y + '-' + m + '-' + d + ' ' + x.toLocaleTimeString(); 

	return yyyymmdd_hhmm;
}

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
//		console.log('write end');
	}catch(e){
		console.log(e);
	}
}
