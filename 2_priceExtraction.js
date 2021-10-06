// const
var config = require('./constant.js')

// Include the chrome driver 
require("chromedriver");
// ChromeDriver chrome = new ChromeDriver(@"C:\web-crawler\install");      // the directory of chromedriver.exe
// write file
const fs = require("fs");

// analys
const client = require('cheerio-httpcli')
client.set('iconv', 'iconv-lite');

// Include selenium webdriver 
let swd = require("selenium-webdriver"); 
let browser = new swd.Builder(); 
let tab = browser.forBrowser("chrome").build(); 

//database
const nedb_promise = require('nedb-promise');
const nedb_file_name = config.eichholtz_envConf.nedb_file_name;

const joblog = config.log; // config.path + 'output\\log.txt';


const db = {};
db.eichholtz = new nedb_promise({
	filename: nedb_file_name,
	autoload : true
});


// Step 1 - Opening the geeksforgeeks sign in page 
let tabToOpen = tab.get(config.loginURL); 
tabToOpen.then(function () { 
	// Timeout to wait if connection is slow 
	let findTimeOutP = 
		tab.manage().setTimeouts({ 
			implicit: 10000, // 10 seconds 
		}); 
	return findTimeOutP; 
}) 
.then(async function () {

	// model close
	await tab.findElement(swd.By.xpath("//*[@id='popup-modal']/div[1]/div/div/span")).click();

	// open login page
	let tabToOpen = tab.get(config.loginURL); 

})
.then(async function () {
	
	// login
	// email		
	await tab.findElement(swd.By.xpath("/html/body/div[6]/main/div[3]/div/div[4]/div[1]/div[2]/form/fieldset/div[2]/div/input")).sendKeys(config.user_info.username); 

	// pass
	await tab.findElement(swd.By.xpath("/html/body/div[6]/main/div[3]/div/div[4]/div[1]/div[2]/form/fieldset/div[3]/div/input")).sendKeys(config.user_info.password); 

	// SignIn
	let promiseClickSignIn = await tab.findElement(swd.By.xpath("/html/body/div[7]/main/div[3]/div/div[4]/div[1]/div[2]/form/fieldset/div[5]/div[1]/button/span")).click();

	// wait account info show
	tab.wait(function () {
		return tab.findElement(swd.By.className("box-eichholtz-account"));
	}, 10000);

	return promiseClickSignIn;
})
.then(async function (promiseClickSignIn) { 

	let _date = readCSV();
	
	console.log("date: " + _date)
	
	let productList = await db.eichholtz.find({date: _date});

	// search
	for(let i=0; i<productList.length; i++){

		let beforePrice = 0;

		if(!productList[i].eichholtz_price){

			try{
				// search field clear
				await tab.findElement(swd.By.xpath("/html/body/header/div[1]/div[2]/form/div[1]/div/input")).clear();
				// search a product by id
				await tab.findElement(swd.By.xpath("/html/body/header/div[1]/div[2]/form/div[1]/div/input")).sendKeys(productList[i].eichholtz_id); 
				// execute search
				await tab.findElement(swd.By.xpath("/html/body/header/div[1]/div[2]/form/div[2]/button")).click();
				// // get id
				// let productID = await tab.findElement(swd.By.xpath("//*[@id='priceLoading']")).getAttribute('data-sku'); 

				// get price
//				let productPrice = await tab.findElement(swd.By.xpath("//*[@id='product-price-']")).getAttribute('data-price-amount'); 
//				let productPrice = await tab.findElement(swd.By.xpath("//*[@class='price-wrapper']")).getAttribute('data-price-amount'); 
				let productPrice = await tab.findElement(swd.By.xpath("//*[contains(@class, 'price-wrapper')]")).getAttribute('data-price-amount'); 

				if( beforePrice === productPrice ){

					console.log('(' + i +') '+ productList[i].eichholtz_id + '   price:' + productPrice + '   it might not read price')
					throw err

				}else{
					// if( productID == productList[i].eichholtz_id ){
						// update db
						await db.eichholtz.update( {$and : [{eichholtz_id: productList[i].eichholtz_id},{date: _date}]}, {$set:{eichholtz_price: productPrice} });
					// }else{
					// 	console.log('different ID:' +productID +' : '+ productList[i].eichholtz_id )
					// }

					beforePrice = productPrice;

					console.log('(' + i +') '+ productList[i].eichholtz_id + '   price:' + productPrice )

				}


			}catch(e){
				console.log('error' + e)
			}

		}else{
			console.log('skip:' + productList[i].eichholtz_id);
		}
	}
}) 
.catch(function (err) { 
	console.log("Error ", err, " occurred!"); 
}).finally(function(){
	jobwritelog( __filename )
}); 


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
