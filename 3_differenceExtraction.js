// const
var config = require('./constant.js')

// Excel
const xlsx = require('xlsx-writestream');

// write file
const fs = require("fs");

//log
const joblog = config.log; 

//database
const nedb_promise = require('nedb-promise');

const db = {};
db.eichholtz = new nedb_promise({
	// filename: nedb_file_name,
	filename: 'list-items.nedb',
	autoload : true
});

async function main(_date, _compareDate){

	console.log('=========================================start===========================================')
	console.log('date: ' + _date);
	console.log('compareDate: ' + _compareDate);

	// Item key
	// output file name

	const result_all = config.path + 'output\\' + _date +'_1_all';
	const result_new = config.path + 'output\\' + _compareDate + '_' + _date +'_2_new';
	const result_deleted = config.path + 'output\\' + _compareDate + '_' + _date +'_3_deleted';

	let _newdata = await db.eichholtz.find({date: _date });
	let check_result = []
	let check_all = []

	console.log('checking new start')
	console.log('count:' + _newdata.length)

	for (let loop = 0; loop < _newdata.length; loop++) {

		writelog(result_all, _newdata[loop].eichholtz_id )
		check_all.push(_newdata[loop]);

		// check new or update
		// the same id and the same date
		let docs = await db.eichholtz.findOne({ $and:[{ eichholtz_id: _newdata[loop].eichholtz_id} , {date: _compareDate }]} );

		if( !docs ){
			console.log('new (' + loop + '): ' + _newdata[loop].eichholtz_id)
			writelog(result_new, _newdata[loop].eichholtz_id)
			check_result.push(_newdata[loop]);
		}
	}


	await writeExcel(result_all, check_all)
	await writeExcel(result_new, check_result)

	console.log('checking new end')

	console.log('checking delete start')
	// clear
	check_result = []
	let oldproductList = await db.eichholtz.find({ date: _compareDate });

	for (let loop = 0; loop < oldproductList.length; loop++) {

		// check new or update
		// the same id and the same date
		let docs = await db.eichholtz.findOne({ $and:[{ eichholtz_id: oldproductList[loop].eichholtz_id} , {date: _date }]} );

		if( !docs ){
			console.log('delete(' + loop + '): ' + oldproductList[loop].eichholtz_id)
			writelog(result_deleted, oldproductList[loop].eichholtz_id)
			check_result.push(oldproductList[loop]);
		}
	}

	await writeExcel(result_deleted, check_result)

	console.log('checking delete end')

	jobwritelog( __filename )

	console.log('======================================end===============================================')
}

main(readCSV(), readCSV(1));

/**
 * 
 * @param {filename} filename 
 * @param {messege} text 
 */

function writelog(filename,text){

	try {
		fs.appendFileSync (filename + '.txt', text + "\n", function(err){
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
 * @param {*} dir 
 * @param {*} data 
 */
function writeExcel(dir, data){
	xlsx.write( dir + '.xlsx' , data, function (err) {
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
